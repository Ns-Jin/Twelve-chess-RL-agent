var menu_left = document.getElementById("menu_left");
var menu_right = document.getElementById("menu_right");
var modal = document.getElementById("myModal");
var close_btn = document.getElementsByClassName("close")[0];
var conditionalBtn = document.getElementById("conditionalBtn");
var alwaysActiveBtn = document.getElementById("alwaysActiveBtn");

async function checkModelExists(modelName) {
    try {
        // 모델을 로드하여 확인
        const model = await tf.loadLayersModel(`indexeddb://${modelName}`);
        return true;
    } catch (error) {
        console.log(`Model ${modelName} not found in IndexedDB.`);
        return false;
    }
}

menu_left.addEventListener("click", (e) => {
    // menu의 왼쪽 요소를 클릭하면 agent 학습 페이지로 이동
    window.location.href = "./pages/agent_learning.html";
});

menu_right.addEventListener("click", (e) => {
    modal.style.display = "block";
    if (checkModelExists("opponent")) {
        conditionalBtn.disabled = false;
    }
    else {
        conditionalBtn.disabled = true;
    }
});

close_btn.onclick = function() {
    modal.style.display = "none";
}

conditionalBtn.addEventListener("click", (e) => {
    // 커스텀 모델선택
    window.location.href = "./pages/battle_space.html?model=custom_model";
});

alwaysActiveBtn.addEventListener("click", (e) => {
    // 최적 모델 선택
    window.location.href = "./pages/battle_space.html?model=optimal_model";
});

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}