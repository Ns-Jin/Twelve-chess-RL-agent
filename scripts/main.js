let menu_left = document.getElementById('menu_left');
let menu_right = document.getElementById('menu_right');

menu_left.addEventListener("click", (e) => {
    window.location.href = "./pages/agent_learning.html";
});

menu_right.addEventListener("click", (e) => {
    window.location.href = "./pages/tc_battle.html";
});
