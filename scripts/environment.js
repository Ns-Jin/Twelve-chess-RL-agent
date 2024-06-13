/*
    십이장기 환경
*/
const FINALLY_REWARD = 10;

export const 공 = {num: 0, reward: 0, team: 'none'};
export const red_장 = {num: 1, reward: 0.5, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1]]};
export const red_왕 = {num: 2, reward: FINALLY_REWARD, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]};
export const red_상 = {num: 3, reward: 0.5, team: 'red', actions: [[1,1],[-1,1],[1,-1],[-1,-1]]};
export const red_자 = {num: 4, reward: 0.25, team: 'red', actions: [[-1,0]]};
export const red_후 = {num: 5, reward: 0.25, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,-1],[-1,-1]]};
export const green_장 = {num: 6, reward: 0.5, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1]]};
export const green_왕 = {num: 7, reward: FINALLY_REWARD, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]};
export const green_상 = {num: 8, reward: 0.5, team: 'green', actions: [[1,1],[-1,1],[1,-1],[-1,-1]]};
export const green_자 = {num: 9, reward: 0.25, team: 'green', actions: [[1,0]]};
export const green_후 = {num: 10, reward: 0.25, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1]]};
export const units = [공,red_장,red_왕,red_상,red_자,red_후,green_장,green_왕,green_상,green_자,green_후];

export class Environment {
    constructor(cell_size) {
        // 현재 보드 상태, 처음에는 초기화된 상태로 존재
        this.init_state = [
            [공, 공, 공],
            [공, 공, 공],
            [green_장, green_왕, green_상],
            [공, green_자, 공],
            [공, red_자, 공],
            [red_상, red_왕, red_장],
            [공, 공, 공],
            [공, 공, 공]
        ];
        this.state = JSON.parse(JSON.stringify(this.init_state));
        this.actions = this._init_actions();
        this.action_size = this.actions.length;

        this.board_row = this.state[0].length;
        this.board_col = this.state.length;

        this.cell_size = cell_size; // 각 셀의 크기
        this.pocket_cell_size = this.cell_size / 2; // 포켓 셀 크기
        this.board_width = cell_size * this.board_row;
        this.board_height = cell_size * this.board_col / 2;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.board_width * 2;
        this.canvas.height = this.board_height;
        this.ctx = this.canvas.getContext('2d');
        
        // 왕이 상대 구역에 들어갔는지 확인
        this.red_touch_down = false;
        this.green_touch_down = false;

        this.ctx.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.error('WebGL context lost');
        });

        this.ctx.canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            this._reinit(); // 컨텍스트 복구 후 재초기화 로직 추가
        });
    }

    /********************************* private *********************************/
    
    /* 가능한 모든 action 정의, 초기화
        return: actions
            게임 내에서 수행가능한 모든 action (turn에 구애받지 않음) */ 
    _init_actions() {
        // 액션을 동적으로 선언하려 했으나 고려해야할 부분이 많아 명시적으로 선언함
        const actions = [
            [[0,0],[2,0]],[[0,0],[2,1]],[[0,0],[2,2]],[[0,0],[3,0]],[[0,0],[3,1]],[[0,0],[3,2]],[[0,0],[4,0]],[[0,0],[4,1]],[[0,0],[4,2]],[[0,0],[5,0]],[[0,0],[5,1]],[[0,0],[5,2]],
            [[0,1],[2,0]],[[0,1],[2,1]],[[0,1],[2,2]],[[0,1],[3,0]],[[0,1],[3,1]],[[0,1],[3,2]],[[0,1],[4,0]],[[0,1],[4,1]],[[0,1],[4,2]],[[0,1],[5,0]],[[0,1],[5,1]],[[0,1],[5,2]],
            [[0,2],[2,0]],[[0,2],[2,1]],[[0,2],[2,2]],[[0,2],[3,0]],[[0,2],[3,1]],[[0,2],[3,2]],[[0,2],[4,0]],[[0,2],[4,1]],[[0,2],[4,2]],[[0,2],[5,0]],[[0,2],[5,1]],[[0,2],[5,2]],
            [[1,0],[2,0]],[[1,0],[2,1]],[[1,0],[2,2]],[[1,0],[3,0]],[[1,0],[3,1]],[[1,0],[3,2]],[[1,0],[4,0]],[[1,0],[4,1]],[[1,0],[4,2]],[[1,0],[5,0]],[[1,0],[5,1]],[[1,0],[5,2]],
            [[1,1],[2,0]],[[1,1],[2,1]],[[1,1],[2,2]],[[1,1],[3,0]],[[1,1],[3,1]],[[1,1],[3,2]],[[1,1],[4,0]],[[1,1],[4,1]],[[1,1],[4,2]],[[1,1],[5,0]],[[1,1],[5,1]],[[1,1],[5,2]],
            [[1,2],[2,0]],[[1,2],[2,1]],[[1,2],[2,2]],[[1,2],[3,0]],[[1,2],[3,1]],[[1,2],[3,2]],[[1,2],[4,0]],[[1,2],[4,1]],[[1,2],[4,2]],[[1,2],[5,0]],[[1,2],[5,1]],[[1,2],[5,2]],
            [[2,0],[2,1]],[[2,0],[3,0]],[[2,0],[3,1]],
            [[2,1],[2,0]],[[2,1],[2,2]],[[2,1],[3,0]],[[2,1],[3,1]],[[2,1],[3,2]],
            [[2,2],[2,1]],[[2,2],[3,1]],[[2,2],[3,2]],
            [[3,0],[2,0]],[[3,0],[2,1]],[[3,0],[3,1]],[[3,0],[4,0]],[[3,0],[4,1]],
            [[3,1],[2,0]],[[3,1],[2,1]],[[3,1],[2,2]],[[3,1],[3,0]],[[3,1],[3,2]],[[3,1],[4,0]],[[3,1],[4,1]],[[3,1],[4,2]],
            [[3,2],[2,1]],[[3,2],[2,2]],[[3,2],[3,1]],[[3,2],[4,1]],[[3,2],[4,2]],
            [[4,0],[3,0]],[[4,0],[3,1]],[[4,0],[4,1]],[[4,0],[5,0]],[[4,0],[5,1]],
            [[4,1],[3,0]],[[4,1],[3,1]],[[4,1],[3,2]],[[4,1],[4,0]],[[4,1],[4,2]],[[4,1],[5,0]],[[4,1],[5,1]],[[4,1],[5,2]],
            [[4,2],[3,1]],[[4,2],[3,2]],[[4,2],[4,1]],[[4,2],[5,1]],[[4,2],[5,2]],
            [[5,0],[5,1]],[[5,0],[4,0]],[[5,0],[4,1]],
            [[5,1],[5,0]],[[5,1],[5,2]],[[5,1],[4,0]],[[5,1],[4,1]],[[5,1],[4,2]],
            [[5,2],[5,1]],[[5,2],[4,1]],[[5,2],[4,2]],
            [[6,0],[2,0]],[[6,0],[2,1]],[[6,0],[2,2]],[[6,0],[3,0]],[[6,0],[3,1]],[[6,0],[3,2]],[[6,0],[4,0]],[[6,0],[4,1]],[[6,0],[4,2]],[[6,0],[5,0]],[[6,0],[5,1]],[[6,0],[5,2]],
            [[6,1],[2,0]],[[6,1],[2,1]],[[6,1],[2,2]],[[6,1],[3,0]],[[6,1],[3,1]],[[6,1],[3,2]],[[6,1],[4,0]],[[6,1],[4,1]],[[6,1],[4,2]],[[6,1],[5,0]],[[6,1],[5,1]],[[6,1],[5,2]],
            [[6,2],[2,0]],[[6,2],[2,1]],[[6,2],[2,2]],[[6,2],[3,0]],[[6,2],[3,1]],[[6,2],[3,2]],[[6,2],[4,0]],[[6,2],[4,1]],[[6,2],[4,2]],[[6,2],[5,0]],[[6,2],[5,1]],[[6,2],[5,2]],
            [[7,0],[2,0]],[[7,0],[2,1]],[[7,0],[2,2]],[[7,0],[3,0]],[[7,0],[3,1]],[[7,0],[3,2]],[[7,0],[4,0]],[[7,0],[4,1]],[[7,0],[4,2]],[[7,0],[5,0]],[[7,0],[5,1]],[[7,0],[5,2]],
            [[7,1],[2,0]],[[7,1],[2,1]],[[7,1],[2,2]],[[7,1],[3,0]],[[7,1],[3,1]],[[7,1],[3,2]],[[7,1],[4,0]],[[7,1],[4,1]],[[7,1],[4,2]],[[7,1],[5,0]],[[7,1],[5,1]],[[7,1],[5,2]],
            [[7,2],[2,0]],[[7,2],[2,1]],[[7,2],[2,2]],[[7,2],[3,0]],[[7,2],[3,1]],[[7,2],[3,2]],[[7,2],[4,0]],[[7,2],[4,1]],[[7,2],[4,2]],[[7,2],[5,0]],[[7,2],[5,1]],[[7,2],[5,2]]
        ];

        return actions;
    }

    /* 캔버스 컨텍스트가 사라지는 에러 해결을 위해 컨텍스트 재정의 */ 
    _reinit() {
        this.ctx = this.canvas.getContext('2d'); // 예시: 컨텍스트 다시 얻기
        // 추가적인 재초기화 로직
    }

    /* 플레이어가 가진 말 탐색
        parameter: turn
            해당 턴이 green의 턴인지 red의 턴인지 매개변수로 전달
        return: unit_positions
            본인 유닛들의 위치 확인 */
    _find_units(turn) {
        const unit_positions = [];
        for (let i = 0; i < this.state.length; i++) {
            for (let j = 0; j < this.state[i].length; j++) {
                const cell = this.state[i][j];
                if (cell.team == turn) {
                    unit_positions.push([i, j]);
                }
            }
        }
        return unit_positions;
    }

    /* 보드에 빈 공간 탐색 (포켓에서 보드로 놓는 상황에 빈 공간을 찾음)
        parameter: turn
            해당 턴이 green의 턴인지 red의 턴인지 매개변수로 전달
        return: possible_positions
            본인 유닛들의 위치 확인 */
    _find_empty_for_unit(turn) {
        let min_i, max_i;
        if (turn === 'red') {
            min_i = 3; max_i= 5;
        }
        else {
            min_i = 2; max_i= 4;
        }
        const possible_positions = [];
        for (let i = min_i; i <= max_i; i++) {
            for (let j = 0; j < this.state[i].length; j++) {
                const cell = this.state[i][j];
                if (cell.num == 0) {
                    possible_positions.push([i, j]);
                }
            }
        }

        return possible_positions;
    }
    
    /* 유닛이 본인 포켓에 있는 지 확인
        parameter: turn
            해당 턴이 green의 턴인지 red의 턴인지 매개변수로 전달
        parameter: unit
            특정 unit의 보드내 좌표 [i,j]
        return: in_pocket (bool)
            포켓에 있다면 true, 없다면 false 반환 */
    _is_unit_in_pocket(turn, unit) {
        let in_pocket = false; 
        if (turn === 'green') {
            if (unit[0] == 0 || unit[0] == 1) {
                in_pocket = true;
            }
        }
        else {
            if (unit[0] == 6 || unit[0] == 7) {
                in_pocket = true;
            }
        }

        return in_pocket;
    }

    /* 턴을 넘기는 업데이트
        this.who_turn을 업데이트 */
    _update_turn() {
        if(this.who_turn == 'red') {
            this.who_turn = 'green';
        }
        else {
            this.who_turn = 'red';
        }
    }

    /* 상대 유닛을 내유닛으로 만들어서 포켓으로 가져옴
        parameter: target_unit
            잡을 상대 유닛
        parameter: turn
            현재 turn */
    _get_unit(state, target_unit, turn) {
        let unit_num = target_unit.num; 
        let exchanged_unit; // 내팀 유닛으로 변경후 저장
        let temp_state = JSON.parse(JSON.stringify(state));

        if (unit_num % 5 == 0) {
            // '후'를 '자'로 바꿔서 가져옴
            exchanged_unit = units[(unit_num+4) % 10];
        }
        else {
            exchanged_unit = units[(unit_num+5) % 10];
        }

        // 상대 포켓에 빈자리를 찾고 그곳에 해당 유닛을 넣기
        let pocket_start_index = (turn === 'red') ? 6 : 0; // red의 경우, green의 경우
        let pocket_end_index = pocket_start_index + 2;

        for (let i = pocket_start_index; i < pocket_end_index; i++) {
            for (let j = 0; j < 3; j++) {
                if (temp_state[i][j].num === 0) {
                    temp_state[i][j] = exchanged_unit;
                    return temp_state;
                }
            }
        }
        return temp_state;
    }

    /* 왕과 자가 상대 진영으로 들어갈 시 이벤트 처리
        왕이 들어갈 시 한턴 버티면 승리하기위해 트리거 true설정
        자가 들어갈 시 후로 바뀌도록 설정 */
    _check_king_and_ja_in_opponent_area() {
        for (let row = 0; row < this.state.length; row++) {
            for (let col = 0; col < this.state[row].length; col++) {
                const cell = this.state[row][col];
                if (cell.num === 2 && cell.team === 'red' && row === 2) { // red 왕이 green 구역에 있는 경우
                    this.red_touch_down = true; // red 왕이 green 구역에 도달
                }
                else if (cell.num === 7 && cell.team === 'green' && row === 5) { // green 왕이 red 구역에 있는 경우
                    this.green_touch_down = true; // green 왕이 red 구역에 도달
                }
                else if (cell.num === 4 && cell.team === 'red' && row === 2) { // red 왕이 green 구역에 있는 경우
                    this.state[row][col] = red_후;
                }
                else if (cell.num === 9 && cell.team === 'green' && row === 5) { // green 왕이 red 구역에 있는 경우
                    this.state[row][col] = green_후;
                }
            }
        }
    }

    /* action을 수행하여 state를 업데이트
        parameter: action
            {'current_location': [x,y], 'target_location': [x',y']} x,y의 말을 x',y'로 이동
        return: reward
            현재  */
    _update_state(action, turn) {
        const current_location = this.actions[action][0];
        const target_location = this.actions[action][1];
        let reward = 0.0;

        let next_state = JSON.parse(JSON.stringify(this.state));

        const target_unit = next_state[target_location[0]][target_location[1]];
        if (target_unit.num != 0) {
            next_state = JSON.parse(JSON.stringify(this._get_unit(next_state, target_unit, turn)));
            reward = target_unit.reward;
        }
        next_state[target_location[0]][target_location[1]] = next_state[current_location[0]][current_location[1]];
        next_state[current_location[0]][current_location[1]] = 공;

        this.state = JSON.parse(JSON.stringify(next_state));

        return reward;
    }

    /* 배열이 같은지 확인
        parameter: a, b
            비교할 배열 2개
        return: bool
            같으면 true, 아니면 false  */
    _arrays_equal(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    /* 액션을 index로 변환
        parameter: target_action
            [[x,y],[x',y']]: x,y좌표의 말을 x',y'로 이동
        return: integer
            this.actions에서 target_action의 인덱스를 반환 */
    _find_action_index(target_action) {
        return this.actions.findIndex(action => {
            return action.length === target_action.length &&
                   action.every((sub_array, index) => this._arrays_equal(sub_array, target_action[index]));
        });
    }

    /* 보드에 말을 생성
        parameter: row, col, unit
            row, col: 보드의 index
            unit: 그릴 말 */
    _drawCell(row, col, unit) {
        let x, y, size;
    
        if (row < 2) {
            x = col * this.pocket_cell_size;
            y = row * this.pocket_cell_size;
            size = this.pocket_cell_size;
        } else if (row > 5) {
            x = (this.board_width + this.pocket_cell_size * 3) + col * this.pocket_cell_size;
            y = (row - 6) * this.pocket_cell_size + this.board_height - this.cell_size;
            size = this.pocket_cell_size;
        } else {
            x = col * this.cell_size + this.pocket_cell_size * 3;
            y = (row - 2) * this.cell_size;
            size = this.cell_size;
        }
    
        if (unit.num !== 0) {
            const img = new Image();
            img.src = `../images/${unit.team}_${unit.num}.png`; // 이미지 파일 경로에 맞게 수정
            img.onload = () => {
                this.ctx.drawImage(img, x, y, size, size);
            };
        }
    }

    /* canvas에 image draw
        parameter: src, x, y, width, height
            src: 그릴 image 파일의 위치
            x, y: 그릴 위치의 시작점
            width, height: 그릴 이미지의 크기 */
    _drawImage(src, x, y, width, height) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                this.ctx.drawImage(img, x, y, width, height);
                resolve();
            };
            img.onerror = reject;
        });
    }

    /********************************* public *********************************/
    /* 게임 초기화 */
    reset() {
        this.state = JSON.parse(JSON.stringify(this.init_state));
        this.who_turn = 'red';
        this.red_touch_down = false;
        this.green_touch_down = false;

        return { state: this.state, turn: this.who_turn };
    }

    /* 플레이어가 할 수 있는 actions
        parameter: turn
            해당 턴이 green의 턴인지 red의 턴인지 매개변수로 전달
        return: possible_actions
            유닛의 원래 위치, 움직일 위치, 받는 보상 */
    find_possible_actions(state, turn, unit=undefined) {
        const possible_actions = [];

        let units;
        if(unit == undefined) {
            // 본인이 가진 말들의 위치 확인, [i,j]
            units = this._find_units(turn);
        }
        else {
            units = [unit];
        }
        // console.log("My units:",units);
        for (let i=0;i<units.length;i++) {
            let unit = units[i];
            // 만약 포켓에 있다면 보드의 빈 위치 선택 가능하다면
            if (this._is_unit_in_pocket(turn, unit)) {
                let empty_positions = this._find_empty_for_unit(turn);
                for(let k=0; k<empty_positions.length; k++) {
                    let action_index = this._find_action_index([unit, empty_positions[k]]);
                    possible_actions.push(action_index);
                }
            }
            // 그렇지 않다면
            else {
                let unit_actions = state[unit[0]][unit[1]].actions;
                for(let j=0;j<unit_actions.length;j++) {
                    let action = unit_actions[j];
                    let new_i = unit[0] + action[0];
                    let new_j = unit[1] + action[1];
                    // action을 수행했는데 보드 밖으로 나가지 않고 같이 팀이 없어야 액션에 추가
                    if(new_i >= 2 && new_i <= 5 && new_j >= 0 && new_j <= 2 && turn != state[new_i][new_j].team) {
                        let action_index = this._find_action_index([unit, [new_i, new_j]]);
                        possible_actions.push(action_index);
                    }
                }
            }
        }
        return possible_actions;
    }

    /* 보드를 업데이트
        parameter: container_id
            해당 html 요소에 canvas를 통해 현재 보드 상태를 rendering */
    render(container_id) {
        const container = document.getElementById(container_id);
        if (!container) {
            console.error(`Container with id ${container_id} not found`);
            return;
        }
    
        container.innerHTML = ''; // 기존 내용을 비웁니다.
        container.appendChild(this.canvas);
    
        const pocketWidth = this.pocket_cell_size * 3;
        const pocketHeight = this.pocket_cell_size * 2;
    
        this._drawImage('../images/pocket.png', 0, 0, pocketWidth, pocketHeight)
            .then(() => this._drawImage('../images/pocket.png', this.board_width + pocketWidth, this.board_height-pocketHeight, pocketWidth, pocketHeight))
            .then(() => this._drawImage('../images/board.png', pocketWidth, 0, this.board_width, this.board_height))
            .then(() => {
                for (let i = 0; i < this.state.length; i++) {
                    for (let j = 0; j < this.state[i].length; j++) {
                        this._drawCell(i, j, this.state[i][j]);
                    }
                }
            })
            .catch(error => console.error(error));
    }

    /* episode step
        return reward
            해당 step을 통해 얻는 reward*/
    step(action) {
        // 행동을 하고 그에따라 state를 업데이트 하고
        let done = false;
        let turn = this.who_turn;
        let reward = this._update_state(action, turn);

        this._check_king_and_ja_in_opponent_area();

        // 게임이 끝났는지 확인
        if(reward == FINALLY_REWARD) {
            done = true;
        }
        else if ((turn === 'green' && this.red_touch_down) || (turn === 'red' && this.green_touch_down)) {
            // 왕이 한 턴 동안 상대 구역에 버티면 승리
            reward = -FINALLY_REWARD;
            done = true;
            this._update_turn();
        }

        // 턴을 넘김
        this._update_turn();
        turn = this.who_turn;
        let next_state = this.state;

        return {next_state, turn, reward, done}
    }
}