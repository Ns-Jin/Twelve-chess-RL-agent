/*
    십이장기 환경
*/

export const 공 = {num: 0, reward: 0};
export const red_장 = {num: 1, reward: 0.5, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1]]};
export const red_왕 = {num: 2, reward: 1, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]};
export const red_상 = {num: 3, reward: 0.5, team: 'red', actions: [[1,1],[-1,1],[1,-1],[-1,-1]]};
export const red_자 = {num: 4, reward: 0.25, team: 'red', actions: [[-1,0]]};
export const red_후 = {num: 5, reward: 0.25, team: 'red', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,-1],[-1,-1]]};
export const green_장 = {num: 6, reward: 0.5, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1]]};
export const green_왕 = {num: 7, reward: 1, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]};
export const green_상 = {num: 8, reward: 0.5, team: 'green', actions: [[1,1],[-1,1],[1,-1],[-1,-1]]};
export const green_자 = {num: 9, reward: 0.25, team: 'green', actions: [[1,0]]};
export const green_후 = {num: 10, reward: 0.25, team: 'green', actions: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1]]};

export class Environment {
    constructor() {
        // 현재 보드 상태, 처음에는 초기화된 상태로 존재
        this.state = [
            [공, 공, 공],
            [공, 공, 공],
            [green_장, green_왕, green_상],
            [공, green_자, 공],
            [공, red_자, 공],
            [red_상, red_왕, red_장],
            [공, 공, 공],
            [공, 공, 공]
        ];
        this.board_row = this.state[0].length;
        this.board_col = this.state.length;
        this.canvas = this._build_canvas()
        
    }

    /********************************* private *********************************/
    /* 게임이 실행될 canvas 초기화 */
    _build_canvas() {

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
                if (cell.team == trun) {
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
        return: bool
            포켓에 있다면 true, 없다면 false 반환 */
    _is_unit_in_pocket(turn, unit) {
        let in_pocket = false; 
        if (turn === 'red') {
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
            this.who_turn == 'green';
        }
        else {
            this.who_turn == 'red';
        }
    }

    /* action을 수행하여 state를 업데이트
        parameter: action
            {'current_location': [x,y], 'next_location': [x',y']} x,y의 말을 x',y'로 이동
        return: reward
            현재  */
    _update_state(action) {
        
    }

    /* 보드를 업데이트
    */
    _render() {

    }

    /********************************* public *********************************/
    /* state, turn 초기화 */
    reset() {
        this.state = [
            [공, 공, 공],
            [공, 공, 공],
            [green_장, green_왕, green_상],
            [공, green_자, 공],
            [공, red_자, 공],
            [red_상, red_왕, red_장],
            [공, 공, 공],
            [공, 공, 공]
        ];
        this.who_turn = 'red';
    }

    /* 플레이어가 할 수 있는 actions
        parameter: turn
            해당 턴이 green의 턴인지 red의 턴인지 매개변수로 전달
        return: possible_actions
            유닛의 원래 위치, 움직일 위치, 받는 보상 */
    find_possible_actions(turn) {
        const possible_actions = [];
        // 본인이 가진 말들의 위치 확인, [i,j]
        let units = this._find_units(turn);
        for (let i=0;i<units.length;i++) {
            let unit = units[i];
            // 만약 포켓에 있다면 보드의 빈 위치 선택 가능하다면
            if (_is_unit_in_pocket(turn, unit)) {
                let empty_positions = _find_empty_for_unit(turn);
                for(let k=0; k<empty_positions.length; k++) {
                    possible_actions.push([unit, empty_positions[k], 0]);
                }
            }
            // 그렇지 않다면
            else {
                let unit_actions = this.state[unit[0]][unit[1]].actions;
                for(let j=0;j<unit_actions.length;j++) {
                    let action = unit_actions[j];
                    let new_i = unit[0] + action[0];
                    let new_j = unit[1] + action[1];
                    // action을 수행했는데 보드 밖으로 나가지 않고 같이 팀이 없어야 액션에 추가
                    if(new_i >= 2 && new_i <= 5 && new_j >= 0 && new_j <= 2 && turn == this.state[new_i][new_j].team) {
                        // 만약 상대의 말을 잡는다면 reward를 그에맞게 리턴
                        possible_actions.push([unit, [new_i, new_j], 0]);
                    }
                }
            }
        }

        return possible_actions
    }

    /* episode step
        return reward
            해당 step을 통해 얻는 reward*/
    step(action) {
        // 행동을 하고 그에따라 state를 업데이트 하고
        let reward = this._update_state(action);
        let done = false;
        let turn = this.who_turn;
        // 랜더링 하고
        this._render()
        // 게임이 끝났는지 확인
        if(reward == 1) {
            done = true;
        }
        // 턴을 넘김
        _update_turn()
        
        return {turn, reward, done}
    }
}