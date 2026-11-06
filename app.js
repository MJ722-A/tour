// ==========================================
// 1. 설정 정보 (본인의 정보로 변경하세요)
// ==========================================
const TOUR_API_KEY = "YOUR_TOUR_API_DECODING_KEY"; // TourAPI 원문 인증키 (Decoding)

const firebaseConfig = {
  apiKey: "AIzaSyBUkDrTxQC_jfP8FmBu07DGP2nmVBclJ0Y",
  authDomain: "myproject-bb02c.firebaseapp.com",
  projectId: "myproject-bb02c",
  storageBucket: "myproject-bb02c.firebasestorage.app",
  messagingSenderId: "185920574841",
  appId: "1:185920574841:web:fc1552be1f57d4c995cba8"
};

// Firebase 초기화 및 Database 참조
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const favoritesRef = db.ref("favorites");

// State 변수
let currentList = [];       // 현재 조회된 관광지 데이터 목록
let favoriteMap = {};       // Firebase에서 동기화받은 찜 데이터 { contentid: itemData }
let currentMode = "all";    // 'all' | 'favorites'

// DOM 요소
const areaSelect = document.getElementById("areaSelect");
const searchBtn = document.getElementById("searchBtn");
const viewAllBtn = document.getElementById("viewAllBtn");
const viewFavoritesBtn = document.getElementById("viewFavoritesBtn");
const tourListContainer = document.getElementById("tourList");
const favCountSpan = document.getElementById("favCount");

// ==========================================
// 2. Firebase 실시간 데이터 동기화
// ==========================================
favoritesRef.on("value", (snapshot) => {
  favoriteMap = snapshot.val() || {};
  const count = Object.keys(favoriteMap).length;
  favCountSpan.textContent = count;

  // 찜목록 모드일 경우 UI 즉시 업데이트
  if (currentMode === "favorites") {
    renderList(Object.values(favoriteMap));
  } else {
    renderList(currentList);
  }
});

// ==========================================
// 3. TourAPI 지역별 관광정보 조회
// ==========================================
async function fetchTourData(areaCode) {
  // TourAPI 4.0 areaBasedList1 명세 사용
  const baseUrl = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";
  const queryParams = [
    `serviceKey=${TOUR_API_KEY}`,
    `numOfRows=20`,
    `pageNo=1`,
    `MobileOS=ETC`,
    `MobileApp=TestApp`,
    `_type=json`,
    `arrange=A`,
    `areaCode=${areaCode}`
  ].join("&");

  const url = `${baseUrl}?${queryParams}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const items = data.response?.body?.items?.item;

    if (!items) {
      currentList = [];
    } else {
      currentList = Array.isArray(items) ? items : [items];
    }
    
    if (currentMode === "all") {
      renderList(currentList);
    }
  } catch (error) {
    console.error("TourAPI Fetch Error:", error);
    alert("관광 데이터를 불러오는데 실패했습니다. 인증키 및 네트워크 상태를 확인해주세요.");
  }
}

// ==========================================
// 4. UI 렌더링
// ==========================================
function renderList(items) {
  tourListContainer.innerHTML = "";

  if (!items || items.length === 0) {
    tourListContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">표시할 관광지 정보가 없습니다.</p>`;
    return;
  }

  items.forEach((item) => {
    const isLiked = !!favoriteMap[item.contentid];
    const imgSrc = item.firstimage || item.firstimage2 || "https://via.placeholder.com/300x180?text=No+Image";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${imgSrc}" alt="${item.title}" loading="lazy">
      <div class="card-body">
        <div>
          <h3 class="card-title">${item.title}</h3>
          <p class="card-addr">${item.addr1 || "주소 정보 없음"}</p>
        </div>
        <button class="like-btn ${isLiked ? "liked" : ""}" data-id="${item.contentid}">
          ${isLiked ? "❤️ 찜 취소" : "🤍 찜하기"}
        </button>
      </div>
    `;

    // 찜 버튼 클릭 이벤트
    const likeBtn = card.querySelector(".like-btn");
    likeBtn.addEventListener("click", () => toggleFavorite(item));

    tourListContainer.appendChild(card);
  });
}

// ==========================================
// 5. Firebase 찜하기 / 찜 취소 토글
// ==========================================
function toggleFavorite(item) {
  const itemRef = db.ref(`favorites/${item.contentid}`);
  
  if (favoriteMap[item.contentid]) {
    // 찜 해제 -> 데이터 삭제
    itemRef.remove();
  } else {
    // 찜 등록 -> 데이터 저장
    const saveData = {
      contentid: item.contentid,
      title: item.title,
      addr1: item.addr1 || "",
      firstimage: item.firstimage || item.firstimage2 || ""
    };
    itemRef.set(saveData);
  }
}

// ==========================================
// 6. 이벤트 리스너 등록 및 초기화
// ==========================================
searchBtn.addEventListener("click", () => {
  currentMode = "all";
  viewAllBtn.classList.add("active");
  viewFavoritesBtn.classList.remove("active");
  fetchTourData(areaSelect.value);
});

viewAllBtn.addEventListener("click", () => {
  currentMode = "all";
  viewAllBtn.classList.add("active");
  viewFavoritesBtn.classList.remove("active");
  renderList(currentList);
});

viewFavoritesBtn.addEventListener("click", () => {
  currentMode = "favorites";
  viewFavoritesBtn.classList.add("active");
  viewAllBtn.classList.remove("active");
  renderList(Object.values(favoriteMap));
});

// 앱 시작 시 서울(areaCode: 1) 데이터 기본 로드
fetchTourData("1");
