let game_name = document.getElementById('12_chess');
let preview_12_chess = document.getElementById('mouse');

game_name.addEventListener("mouseover", (e) => {
    let mouesX = game_name.offsetLeft + 155;
    let mouesY = game_name.offsetTop + 15;
    preview_12_chess.style.visibility = "visible";
    preview_12_chess.style.left = mouesX + "px";
    preview_12_chess.style.top = mouesY + "px";
    console.log(mouesX,mouesY);
});

game_name.addEventListener("mouseout", (e) => {
    preview_12_chess.style.visibility = "hidden";
});
