/* Deque 구현을 위한 Node 구현 */
export class ListNode {
    constructor(value) {
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

/* memory를 위해 Deque 자료구조를 구현 */
export class Deque {
    constructor(max_len) {
        this.max_len = max_len;
        this.length = 0;
        this.head = null;
        this.tail = null;
    }

    push(value) {
        const new_node = new ListNode(value);
        if (this.length === 0) {
            this.head = this.tail = new_node;
        } else {
            new_node.prev = this.tail;
            this.tail.next = new_node;
            this.tail = new_node;
        }
        if (this.length === this.max_len) {
            this.shift();
        } else {
            this.length++;
        }
    }

    pop() {
        if (!this.tail) return undefined;
        const value = this.tail.value;
        this.tail = this.tail.prev;
        if (this.tail) {
            this.tail.next = null;
        } else {
            this.head = null;
        }
        this.length--;
        return value;
    }

    shift() {
        if (!this.head) return undefined;
        const value = this.head.value;
        this.head = this.head.next;
        if (this.head) {
            this.head.prev = null;
        } else {
            this.tail = null;
        }
        this.length--;
        return value;
    }

    unshift(value) {
        const new_node = new ListNode(value);
        if (this.length === 0) {
            this.head = this.tail = new_node;
        } else {
            new_node.next = this.head;
            this.head.prev = new_node;
            this.head = new_node;
        }
        if (this.length === this.max_len) {
            this.pop();
        } else {
            this.length++;
        }
    }

    toArray() {
        const arr = [];
        let current = this.head;
        while (current) {
            arr.push(current.value);
            current = current.next;
        }
        return arr;
    }
}

export class DQNAgent {
    constructor(turn, state_size, action_size, episodes = 50000, model_architecture=[64], discount_factor=0.99, learning_rate=0.01, batch_size=64, render=true) {
        this.turn = turn;
        this.render = render;

        this.state_size = state_size;
        this.action_size = action_size;

        // DQN 하이퍼파라미터
        this.discount_factor = discount_factor;  // 0.99
        this.learning_rate = learning_rate;      // 0.01
        this.epsilon = 1.0;
        this.epsilon_min = 0.005;
        this.epsilon_decay = (this.epsilon - this.epsilon_min) / (episodes * 8); // 경험론적 수치
        this.batch_size = batch_size;            // 64
        this.train_start = 2000;                 // 학습 시작 시점
        this.model_architecture = model_architecture;

        // 리플레이 메모리, 최대 크기 설정
        this.queue_len_max = 5000;
        this.memory = new Deque(this.queue_len_max);

        // 학습 모델, 타겟 모델 똑같이 생성
        this.model = this._build_model(model_architecture);
        this.target_model = this._build_model(model_architecture);

        // 타겟 모델 업데이트 (학습 모델로 덮어씌움)
        this.update_target_model();
    }

    /********************************* private *********************************/
    /* 모델을 생성
        parameter: model_architecture (array)
            모델 구조(필터 수)를 입력으로 받아 모델 구조 설정
        return model
            생성된 모델 리턴 */
    _build_model(model_architecture) {
        const model = tf.sequential();
        model.add(tf.layers.conv2d({ inputShape: [8,3,1], filters: parseInt(this.model_architecture[0]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
        model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        for(let i=1;i<model_architecture.length;i++) {
            model.add(tf.layers.conv2d({ filters: parseInt(this.model_architecture[i]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
            model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        }
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: this.action_size, activation: 'linear', kernelInitializer: 'heUniform' }));
        model.compile({ loss: 'meanSquaredError', optimizer: tf.train.adam(this.learning_rate) });
        model.summary();
        return model;
    }

    /* state 정리
        parameter: state
            현재 상태를 입력으로 받고 포켓에 있는 말을 sort하여 state 경우의 수를 줄임
            (ex> 보드에 있는 말들의 위치가 동일하고 포켓에 있는 말의 종류가 같은 상황에서 포켓에 말의 위치에 따라 서로 다른 state로 정의됨. 이것을 num으로 정렬하여 정규화시킴)
        return state
            업데이트된 state를 반환 */
    _sort_state(state) {
        let temp = [];
        temp.push(...state[0]);
        temp.push(...state[1]);
        temp.sort();
        for(let i=0;i<2;i++) {
            for(let j=0;j<3;j++) {
                state[i][j] = temp[3*i+j];
            }
        }
        temp = [];
        temp.push(...state[6]);
        temp.push(...state[7]);
        temp.sort();
        for(let i=6;i<8;i++) {
            for(let j=0;j<3;j++) {
                state[i][j] = temp[3*(i-6)+j];
            }
        }
        return state;
    }

    /* memory에서 추출할 index 번호를 랜덤으로 얻는 함수
        parameter: array_length, num_idices
            array_length: 추출할 배열의 크기 (즉, memory의 크기)
            num_idices: index를 추출할 갯수
        return: indices
            랜덤으로 추출한 index들을 반환 */
    _get_random_indices(array_length, num_idices) {
        const indices = [];
        while (indices.length < num_idices) {
            const random_index = Math.floor(Math.random() * array_length);
            if (!indices.includes(random_index)) {
                indices.push(random_index);
            }
        }
        return indices;
    }
    
    /* memory에서 추출할 index 번호를 랜덤으로 얻는 함수
        parameter: array, indices
            array: 추출할 배열 (memory)
            indices: 추출할 index 번호들
        return: Array (samples)
            추출한 samples 반환 */
    _get_random_samples(array, indices) {
        return indices.map(index => array[index]);
    }

    /* state를 모델의 입력으로 넣기위해 tensor화
        parameter: state
            state를 num의 값들로만 표현하고 tensor화 하여반환
        return tensor (tf.tensor3d)
            tensor3d의 형태 (8,3,1) 8개의 열, 3개의 행, 1개의 채널로 state를 표현 */
    _extract_board_state(state) {
        return tf.tidy(() => {
            const boardState = state.map(row => row.map(cell => cell.num));
            const sortedBoardState = this._sort_state(boardState, [0,1]);
            const reshapedState = sortedBoardState.map(row => row.map(cell => [cell]));
            const tensor = tf.tensor3d(reshapedState);
            return tensor;
        });
    }
    
    /********************************* public *********************************/

    /* 타겟 모델을 업데이트
        타겟 모델을 모델로 덮어씌우며 업데이트 */
    update_target_model() {
        this.target_model.setWeights(this.model.getWeights());
    }

    /* 현재 state에서 action 선택
        parameter: state
            현재 상태를 선택
        parameter: possible_actions
            현재 상태에서 가능한 actions
        return: action
            현재 상태에서 수행할 수 있는 action을 반환 */
    get_action(state, possible_actions) {
        if (Math.random() <= this.epsilon) {
            const random_index = Math.floor(Math.random() * possible_actions.length);
            return possible_actions[random_index];
        }
        else {
            return tf.tidy(() => {
                const board_state = this._extract_board_state(state);
                const q_values = this.model.predict(tf.expandDims(board_state, 0));
                const q_values_array = q_values.arraySync()[0];
                board_state.dispose();
                q_values.dispose();
                
                // 선택 가능한 행동들만 고려하도록 마스킹 적용
                const masked_q_values = q_values_array.map((value, index) => {
                    return possible_actions.includes(index) ? value : -Infinity;
                });

                // 최대값의 인덱스를 선택
                const max_index = masked_q_values.indexOf(Math.max(...masked_q_values));
                return max_index;
            });
        }
    }

    /* memory에 sample을 추가
        parameter: state, action, reward, next_state, done
            state: action을 수행하기전 상태
            action: 현재 state에서 수행할 action (actions의 index값)
            reward: action을 수행 후 받는 reward 값
            next_state: state에서 action을 수행한 후 다음의 next_state
            done: action후 에피소드가 종료됐는지 확인 */
    append_sample(state, action, reward, next_state, done) {
        this.memory.push({ state, action, reward, next_state, done });
        if (this.epsilon > this.epsilon_min) {
            this.epsilon -= this.epsilon_decay;
        }
    }

    /* model을 학습시키는 함수
        momory에서 배치 사이즈 만큼 샘플들을 랜덤 추출하여 batch 러닝
        model과 target model의 차이를 통해 학습을 진행 */
    async train_model() {
        if (this.memory.length < this.batch_size) return;

        const memory_array = this.memory.toArray();
        
        const randomIndices = this._get_random_indices(memory_array.length, this.batch_size);
        const batch = this._get_random_samples(memory_array, randomIndices);

        // const batch = tf.util.shuffle(memoryArray).slice(0, this.batch_size);
        const states = tf.stack(batch.map(sample => this._extract_board_state(sample.state)), 0);
        const next_states = tf.stack(batch.map(sample => this._extract_board_state(sample.next_state)), 0);

        const targets = tf.tidy(() => {
            const current_q_values = this.model.predict(states);
            const next_q_values = this.target_model.predict(next_states);

    
            const targets_array = current_q_values.arraySync().map((currentQ, index) => {
                const {action, reward, done} = batch[index];
                currentQ[action] = done ? reward : (reward + this.discount_factor * Math.max(...next_q_values.arraySync()[index]));
                return currentQ;
            });
    
            current_q_values.dispose();
            next_q_values.dispose();
    
            return targets_array;
        });
    
        // Performing the asynchronous operation outside of tf.tidy
        const states_tensor = states;
        const targets_tensor = tf.tensor2d(targets, [this.batch_size, this.action_size]);

        await this.model.fit(
            states_tensor, 
            targets_tensor, 
            {
                batch_size: this.batch_size,
                epochs: 1,
                verbose: 0
            }
        );

        // Dispose the tensors after use
        states_tensor.dispose();
        targets_tensor.dispose();
        states.dispose();
        next_states.dispose();
    }

    /* model을 indexedDB에 저장
        parameter: name
            name: 저장할 모델 이름 */
    async save_model(name) {
        await this.model.save(`indexeddb://${name}`);

        // 파라미터를 JSON으로 저장
        const params = {
            turn: this.turn,
            state_size: this.state_size,
            action_size: this.action_size,
            model_architecture: this.model_architecture,
            discount_factor: this.discount_factor,
            learning_rate: this.learning_rate,
            batch_size: this.batch_size,
            render: this.render
        };

        // IndexedDB에 파라미터 저장
        const dbRequest = indexedDB.open('DQNAgentDB', 1);

        dbRequest.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('agentParams')) {
                db.createObjectStore('agentParams', { keyPath: 'name' });
            }
        };

        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['agentParams'], 'readwrite');
            const store = transaction.objectStore('agentParams');
            store.put({ name, params });
        };

        dbRequest.onerror = function(event) {
            console.error('Error opening IndexedDB:', event.target.errorCode);
        };
    }

    /* model을 파일 형태로 저장
        parameter: name
            name: 저장할 모델 이름 */
    async save_model_to_file(name) {
        // 모델을 파일로 저장
        await this.model.save(`downloads://${name}`);
    
        // 파라미터를 JSON으로 저장
        const params = {
            turn: this.turn,
            state_size: this.state_size,
            action_size: this.action_size,
            model_architecture: this.model_architecture,
            discount_factor: this.discount_factor,
            learning_rate: this.learning_rate,
            batch_size: this.batch_size,
            render: this.render
        };
    
        // 파라미터를 Blob으로 변환
        const paramsBlob = new Blob([JSON.stringify({ name, params })], { type: 'application/json' });
    
        // 파라미터 파일 다운로드
        const a = document.createElement('a');
        a.href = URL.createObjectURL(paramsBlob);
        a.download = `${name}_params.json`;
        a.click();
    }

    /* model을 indexedDB에서 불러오기
        parameter: name
            name: 불러올 모델 이름 */
    async load_model(name) {
        this.model = await tf.loadLayersModel(`indexeddb://${name}`);
    }
    
    /* model을 로컬 파일로 불러오기
        parameter: name
            name: 불러올 모델 이름 */
    async load_model_from_file(fileName) {
        const modelUrl = '../saved_models/' + fileName + '.json';
        const modelWeightsUrl = '../saved_models/' + fileName + '.weight';
        const paramsUrl = '../saved_models/' + fileName + '_params.json';
    
        // 모델 파일 로드
        this.model = await tf.loadLayersModel(modelUrl, {weightsUrl: modelWeightsUrl});

        // 파라미터 파일 로드
        const response = await fetch(paramsUrl);
        const paramsText = await response.text();
        const { name, params } = JSON.parse(paramsText);

        console.log(name, params);

        // 파라미터를 객체에 적용
        this.turn = params.turn;
        this.state_size = params.state_size;
        this.action_size = params.action_size;
        this.model_architecture = params.model_architecture;
        this.discount_factor = params.discount_factor;
        this.learning_rate = params.learning_rate;
        this.batch_size = params.batch_size;
        this.render = params.render;
    }
}