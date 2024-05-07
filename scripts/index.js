var menu_left = document.getElementById("menu_left");
var menu_right = document.getElementById("menu_right");
var modal = document.getElementById("myModal");
var close_btn = document.getElementsByClassName("close")[0];
var conditionalBtn = document.getElementById("conditionalBtn");
var alwaysActiveBtn = document.getElementById("alwaysActiveBtn");

menu_left.addEventListener("click", (e) => {
    // menu의 왼쪽 요소를 클릭하면 agent 학습 페이지로 이동
    window.location.href = "./pages/agent_learning.html";
});

menu_right.addEventListener("click", (e) => {
    // 모달창 구현 할거임
    modal.style.display = "block";
    checkLocalStorage();
});

close_btn.onclick = function() {
    modal.style.display = "none";
}

conditionalBtn.addEventListener("click", (e) => {
    // 커스텀 모델선택
    window.location.href = "./pages/tc_main.html?model=custom_model";
});

alwaysActiveBtn.addEventListener("click", (e) => {
    // 최적 모델 선택
    window.location.href = "./pages/tc_main.html?model=optimal_model";
});

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function checkLocalStorage() {
    // 예를 들어, 'myKey' 라는 키를 확인합니다.
    if (localStorage.getItem("myKey")) {
      conditionalBtn.disabled = false;
    } else {
      conditionalBtn.disabled = true;
    }
}

// 버튼 활성화 시키기기 (임시)
localStorage.setItem("myKey","data");

// 버튼 비활성화 시키기 (임시)
//localStorage.clear();