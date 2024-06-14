export class A2CAgent {
    constructor(turn, state_size, action_size, episodes = 50000, model_architecture=[64], discount_factor=0.99, learning_rate=0.001, render=true) {
        this.turn = turn;
        this.render = render;

        this.state_size = state_size;
        this.action_size = action_size;
        this.value_size = 1;

        // A2C 하이퍼파라미터
        this.discount_factor = discount_factor;  // 0.99
        this.actor_lr = learning_rate;      // 0.001
        this.critic_lr = learning_rate*5;      // 0.005
        
        // 학습 모델, 타겟 모델 똑같이 생성
        this.model_architecture = model_architecture;
        this.actor_model = this._build_actor_model(model_architecture);
        this.critic_model = this._build_critic_model(model_architecture);
    }

    /********************************* private *********************************/
    /* 모델을 생성
        parameter: model_architecture (array)
            모델 구조(필터 수)를 입력으로 받아 모델 구조 설정
        return model
            생성된 모델 리턴 */
    _build_actor_model(model_architecture) {
        const model = tf.sequential();
        model.add(tf.layers.conv2d({ inputShape: [8,3,1], filters: parseInt(this.model_architecture[0]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
        model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        for(let i=1;i<model_architecture.length;i++) {
            model.add(tf.layers.conv2d({ filters: parseInt(this.model_architecture[i]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
            model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        }
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: this.action_size, activation: 'softmax', kernelInitializer: 'heUniform' }));
        model.compile({ loss: 'categoricalCrossentropy', optimizer: tf.train.adam(this.actor_lr) });
        model.summary();
        return model;
    }

    /* 모델을 생성
        parameter: model_architecture (array)
            모델 구조(필터 수)를 입력으로 받아 모델 구조 설정
        return model
            생성된 모델 리턴 */
    _build_critic_model(model_architecture) {
        const model = tf.sequential();
        model.add(tf.layers.conv2d({ inputShape: [8,3,1], filters: parseInt(this.model_architecture[0]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
        model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        for(let i=1;i<model_architecture.length;i++) {
            model.add(tf.layers.conv2d({ filters: parseInt(this.model_architecture[i]), kernelSize: [3, 3], padding: 'same', activation: 'relu', kernelInitializer: 'heUniform' }));
            model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [1, 1], padding: 'same' }));
        }
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: this.value_size, activation: 'linear', kernelInitializer: 'heUniform' }));
        model.compile({ loss: 'meanSquaredError', optimizer: tf.train.adam(this.critic_lr) });
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
    
    /********************************* public *********************************/

    /* state를 모델의 입력으로 넣기위해 tensor화
        parameter: state
            state를 num의 값들로만 표현하고 tensor화 하여반환
        return tensor (tf.tensor3d)
            tensor3d의 형태 (8,3,1) 8개의 열, 3개의 행, 1개의 채널로 state를 표현 */
    extract_board_state(state) {
        return tf.tidy(() => {
            const boardState = state.map(row => row.map(cell => cell.num));
            const sortedBoardState = this._sort_state(boardState, [0,1]);
            const reshapedState = sortedBoardState.map(row => row.map(cell => [cell]));
            const tensor = tf.tensor3d(reshapedState);
            return tensor;
        });
    }
    

    /* 현재 state에서 action 선택
        parameter: state
            현재 상태를 선택
        parameter: possible_actions
            현재 상태에서 가능한 actions
        return: action
            현재 상태에서 수행할 수 있는 action을 반환 */
    get_action(state, possible_actions) {
        const logits = this.actor.predict(tf.tensor2d(state, [1, this.state_size]));
        const probabilities = logits.dataSync();
        logits.dispose();
    
        // 모든 행동에 대해 확률을 0으로 초기화
        const masked_probabilities = new Array(this.action_size).fill(0);
        
        // 가능한 행동들의 인덱스에 해당하는 확률만 설정
        possible_actions.forEach(action => {
            masked_probabilities[action] = probabilities[action];
        });
    
        // 확률 정규화
        const totalProbability = masked_probabilities.reduce((acc, prob) => acc + prob, 0);
        const normalized_probabilities = masked_probabilities.map(prob => prob / totalProbability);
    
        // 행동 선택
        const action = tf.multinomial(tf.tensor2d([normalized_probabilities], [1, this.action_size]), 1).dataSync()[0];
        return action;
    }
            

    train_model(state, action, reward, next_state, done) {
        const current_value = this.critic.predict(tf.tensor2d(state, [1, this.state_size])).dataSync();
        const next_value = this.critic.predict(tf.tensor2d(next_state, [1, this.state_size])).dataSync();

        const target = done ? reward : reward + this.discount_factor * next_value;
        const advantage = target - current_value;

        // Update critic
        this.critic.fit(tf.tensor2d(state, [1, this.state_size]), tf.tensor2d([target], [1, 1]), {epochs: 1});

        // Prepare actor update
        const action_onehot = tf.oneHot(tf.tensor1d([action], 'int32'), this.action_size);
        const log_prob = tf.log(tf.sum(tf.mul(this.actor.predict(tf.tensor2d(state, [1, this.state_size])), action_onehot)));
        const actor_loss = tf.mul(tf.scalar(-1), tf.mul(log_prob, tf.scalar(advantage)));

        // Update actor
        const grads = tf.variableGrads(() => actor_loss);
        this.actor.optimizer.applyGradients(grads.grads);
        tf.dispose([action_onehot, log_prob, actor_loss, grads]);
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
            actor_lr: this.actor_lr,
            critic_lr: this.critic_lr,
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
        this.actor_lr = params.actor_lr;
        this.critic_lr = params.critic_lr;
        this.render = params.render;
    }
}