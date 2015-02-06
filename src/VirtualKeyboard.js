/**
 * @fileoverview 유저의 키입력 시간 정보를 캡쳐하는 모듈
 * @author FE개발팀 이제인 <jein.yi@nhnent.com>
 * @dependency jquery-1.8.3.min.js, common.js
 */

/* istanbul ignore next */
if (!ne.component) {
    ne.component = {};
}

/**
 * 클릭 또는 터치로 사용자 입력을 받는 가상키보드 컴포넌트
 * @example
 *
 * // 인스턴스 생성
 * // 자판 배열을 받아와 가상키보드를 생성한다.
 * var vkeyboard = new ne.component.VirtualKeyboard({
 * @todo
 * });
 * @constructor ne.component.VirtualKeyboard
 */
ne.component.VirtualKeyboard = ne.util.defineClass(/** @lends ne.component.VirtualKeyboard.prototype */{
    /**
     * 디폴트 템플릿
     * @readonly
     * @type {object}
     */
    _template: {
        key: '<li><button type="button" value="{KEY}">{KEY}</button></li>',
        blank: '<li></li>'
    },

    /**
     * 고정위치를 갖는 키들의 위치 인덱스 맵데이터
     * @type {object}
     */
    _fixedKeys: {},

    /**
     * 유동위치를 갖는 키들의 배열순서
     * @type {array}
     */
    _rawKeys: [],

    /**
     * 각각의 공백키를 구분할 수 있도록 키값을 부여한 배열순서
     * @type {array}
     */
    _identifiedRawKeys: [],

    /**
     * 가상 키보드의 키 맵데이터
     * @type {object}
     */
    _keyMap: {},

    /**
     * 가상 키보드의 전체 키들(고정위치 + 유동위치)의 배열순서
     * @type {array}
     */
    _keySequences: [],

    /**
     * 키타입별 수행해야하는 콜백함수 맵데이터
     * @type {object}
     */
    _callback: {},

    /**
     * 현재 키패드의 키타입
     * @type {string}
     */
    _currentKeyType: null,

    /**
     * 영문 여부
     * @type {boolean}
     */
    _isEnglish: false,

    /**
     * 특수문자 여부
     * @type {boolean}
     */
    _isSymbol: false,

    /**
     * caps lock 여부
     * @type {boolean}
     */
    _isCapsLock: false,

    /**
     * 키 엘리먼트의 pool로 사용할 documentFragment
     * @type {element}
     */
    _documentFragment: null,

    /**
     * 초기화 함수
     * @param {object} options 가상키보드를 초기화 옵션
     */
    init: function(options) {
        this._initVariables(options || {});

        this._arrangeKeySequence();
        this._refineKeyMap();
        this._initKeyboard(options.container);

        this._attachEvent();
    },

    /**
     * 변수 초기화 함수
     * @param {object} options 가상키보드를 초기화 옵션
     * @private
     */
    _initVariables: function(options) {
        this._currentKeyType = options.keyType || 'english';
        this._fixedKeys = options.functions || {};
        this._rawKeys = this._copyArray(options.keys);
        this._template = ne.util.extend(this._template, options.template);
        this._callback = options.callback || {};
        this._documentFragment = document.createDocumentFragment();
    },

    /**
     * 이벤트 바인딩
     * @private
     */
    _attachEvent: function() {
        // touch event 지원여부 확
        var isSupportTouch = ('createTouch' in document) || ('ontouchstart' in document);
        var eventType = isSupportTouch ? 'touchstart' : 'click';
        this._$container.on(eventType, $.proxy(this._pressKeyHandler, this));
    },

    /**
     * 버튼 클릭/터치 이벤트 처리함수
     * @param event 이벤트 객체
     * @private
     */
    _pressKeyHandler: function(event) {
        var targetButton = this._getTargetButton(event.target),
            inputValue,
            index,
            keyGroup;
        if(!ne.util.isExisty(targetButton)) {
            return false;
        }

        inputValue = targetButton.value;
        index = this._keyMap[inputValue].rawIndex;
        keyGroup = this._getKeyGroup(inputValue);

        if(keyGroup === 'key') {
            this._excuteCallback(keyGroup, index);
        } else {
            this[inputValue]();
            this._excuteCallback(inputValue);
        }
    },

    /**
     * 클릭/터치된 키의 버튼 엘리먼트를 반환한다.
     * @param {element} targetElement 클릭/터치된 타켓 엘리먼트
     * @returns {*}
     * @private
     */
    _getTargetButton: function(targetElement) {
        if(targetElement.tagName.toUpperCase() === 'BUTTON') {
            return targetElement;
        } else {
            return $(targetElement).parent('button')[0];
        }
    },

    /**
     * 가상키보드의 자판을 배열정보를 생성한다.
     * @private
     */
    _arrangeKeySequence: function() {
        var sortedKeys;

        // 고정위치의 키배열을 인덱스 순으로 정렬한다.
        sortedKeys = this._sortFixedKeys();

        // 전달받은 키배열을 복사한다.
        this._identifyRawKeys();
        this._copyArray(this._identifiedRawKeys, this._keySequences);

        // 고정키를 고정위치에 삽입한다.
        ne.util.forEach(sortedKeys, function(value, index) {
            if(ne.util.isExisty(value)) {
                this._keySequences.splice(this._fixedKeys[value], 0, value);
            }
        }, this);
    },

    /**
     * 공백키를 구분할수 있게 키값을 부여한다.
     * @private
     */
    _identifyRawKeys: function() {
        var blankCount = 0;
        ne.util.forEach(this._rawKeys, function(value, index) {
            if(this._getKeyGroup(value) === 'blank') {
                value = 'blank' + blankCount;
                blankCount++;
            }
            this._identifiedRawKeys[index] = value;
        }, this);
    },

    /**
     * 배열을 복사한다. (deep copy는 지원하지 않는다. 덮어쓰기 한다.)
     * @param {array} originalArray 원본배열
     * @param {array} copyArray 복사본배열
     * @returns {*} 복사본배열
     * @private
     */
    _copyArray: function(originalArray, copyArray) {
        if(!ne.util.isExisty(originalArray)) {
            return false;
        }
        if(!ne.util.isArray(originalArray)) {
            originalArray = [originalArray];
        }
        if(!ne.util.isExisty(copyArray) || !ne.util.isArray(copyArray)) {
            copyArray = [];
        }

        ne.util.forEach(originalArray, function(value, index) {
            copyArray[index] = value;
        }, this);

        return copyArray;
    },

    /**
     * 고정위치의 키배열을 정렬한다.
     * @returns {Array} 인덱스 순으로 정렬된 고정위치 키목록
     * @private
     */
    _sortFixedKeys : function() {
        var sortedKeys;
        this._keySequences.length = 0;

        sortedKeys = ne.util.keys(this._fixedKeys) || [];
        sortedKeys.sort($.proxy(function(a, b) {
            return this._fixedKeys[a] - this._fixedKeys[b];
        }, this));

        return sortedKeys;
    },

    /**
     * 키정보를 가공하여 맵데이터를 만든다.
     * @private
     */
    _refineKeyMap: function() {
        this._refineFixedKeys();
        this._refineFloatingKeys();
    },

    /**
     * 고정키 정보를 가공하여 맵데이터를 만든다.
     * @private
     */
    _refineFixedKeys: function() {
        ne.util.forEach(this._fixedKeys, function(value, key) {
            this._keyMap[key] = {
                key: key,
                rawIndex: null,
                positionIndex: value,
                keyGroup: this._getKeyGroup(key)
            };
        }, this);
    },

    /**
     * 유동키 정보를 가공하여 맵데이터를 만든다.
     * @private
     */
    _refineFloatingKeys: function() {
        ne.util.forEach(this._identifiedRawKeys, function(value, index) {
            if(ne.util.isExisty(this._keyMap[value])) {
                // 이미 맵데이터는 생성되있는 상태에서 자판재배열등으로 포지션인덱스만 바뀌는 경우
                this._keyMap[value].positionIndex = this._getPositionIndex(value);
            } else {
                // 맵데이터를 최초 생성하는 경우
                this._keyMap[value] = {
                    key: value,
                    rawIndex: index,
                    positionIndex: this._getPositionIndex(value),
                    keyGroup: this._getKeyGroup(this._rawKeys[index])
                };
            }
        }, this);
    },

    /**
     * 해당 키의 키타입을 반환한다.
     * @param key 키값
     * @returns {string} 키타입
     * @private
     */
    _getKeyGroup: function(key) {
        var keyGroup;
        if(ne.util.isExisty(this._fixedKeys[key])) {
            keyGroup = 'function';
        } else {
            if(key === '') {
                keyGroup = 'blank';
            } else {
                keyGroup = 'key';
            }
        }
        return keyGroup;
    },

    /**
     * 가상키보드내 위치 인덱스를 반환한다.
     * @param key 키값
     * @returns {number} 위치인덱스
     * @private
     */
    _getPositionIndex: function(key) {
        var i = 0,
            length = this._keySequences.length;

        for(; i < length; i++) {
            if(key === this._keySequences[i]) {
                return i;
            }
        }
    },

    /**
     * 가상 키보드를 초기화 한다.
     * @param {string} containerId 키보드 컨테이너
     * @private
     */
    _initKeyboard: function(containerId) {
        this._initContainer(containerId);
        this._arrangeKeys();
    },

    /**
     * 가상 키보드 컨테이너를 초기화 한다.
     * @param {string} containerId 키보드 컨테이너
     * @private
     */
    _initContainer: function(containerId) {
        if(this._$container) {
            ne.util.forEach(this._identifiedRawKeys, function(value) {
                this._documentFragment.appendChild(this._keyMap[value].element);
            }, this);
        } else {
            this._$container = $('#' + containerId);
            if(!ne.util.isHTMLTag(this._$container[0])) {
                this._$container = this._createContainer();
            }
        }
    },

    /**
     * 가상 키보드의 컨테이너를 생성한다.
     * @returns {element}
     * @private
     */
    _createContainer: function() {
        var containerId = 'vk-' + this._getTime(),
            container = $('<ul id=' + containerId + '>');
        $(document.body).append(container);
        return container;
    },

    /**
     * 현재 시간을 반환하는 함수
     * @returns {millisecond} 현재 시간의 millisecond
     */
    _getTime: function() {
        var timeStamp;
        if(Date.now) {
            timeStamp = Date.now() || new Date().getTime();
        }
        return timeStamp;
    },

    /**
     * 가상 키보드 안에 키를 배열한다.
     * @private
     */
    _arrangeKeys: function() {
        var keyElement;
        ne.util.forEach(this._keySequences, function(value) {
            keyElement = this._keyMap[value].element;
            if(!ne.util.isHTMLTag(keyElement)) {
                this._keyMap[value].element = keyElement = this._createKeyElement(value);
            }
            this._$container.append(keyElement);
        }, this);
    },

    /**
     * 해당 키의 템플릿을 반환한다.
     * @param keyGroup 생성할 키 타입
     * @param key 생성할 키 값
     * @returns {string}
     * @private
     */
    _getTemplate: function(keyGroup, key) {
        var template;

        if(keyGroup === 'blank') {
            template = this._template.blank;
        } else {
            template = this._template[key] || this._template.key;
        }

        if(ne.util.isExisty(key)) {
            template = template.replace(/{KEY}/g, key);
        }
        return template;
    },

    /**
     * 키 버튼을 생성하고, 반환한다.
     * @param key 생성할 키 값
     * @returns {element} 키 버튼 엘리먼트
     * @private
     */
    _createKeyElement: function(key) {
        var keyGroup = this._keyMap[key].keyGroup,
            template = this._getTemplate(keyGroup, key),
            keyElement = $(template);
        var buttonElement = keyElement.find('button');
        if(!buttonElement.val() && ne.util.isExisty(key)) {
            buttonElement.val(key);
        }
        return keyElement[0];
    },

    /**
     * 자판 재배열을 처리한다.
     * @param {array} rawKeys 재배열된 키배열
     * @private
     */
    _reArrangeKeys: function(rawKeys) {
        // 기존 키 정보 초기화
        this._rawKeys.length = 0;
        this._keySequences.length = 0;

        this._copyArray(rawKeys, this._rawKeys);
        this._arrangeKeySequence();
        this._refineFloatingKeys();
        this._arrangeKeys();
    },

    /**
     * 사용자 등록 콜백 수행함수
     * @param {string} callbackKey 수행할 콜백함수 키
     * @param {number} rawIndex 입력된 값의 인덱스 번호
     * @private
     */
    _excuteCallback: function(callbackKey, rawIndex) {
        if(ne.util.isExisty(this._callback, callbackKey) && ne.util.isFunction(this._callback[callbackKey])) {
            this._callback[callbackKey](rawIndex);
        }
    },

    /**
     * 자판의 배열정보를 받아온다.
     * @param {boolean} isCaseToggle 대소문자 변환할지 여부
     * @private
     */
    _getRawKeys: function(isCaseToggle) {
        var rawKeys;
        if(ne.util.isExisty(this._callback, 'getKeys') && ne.util.isFunction(this._callback.getKeys)) {
            if(isCaseToggle) {
                // 자판의 위치는 바꾸지 않고 대소문자 변환만한 배열정보를 받아온다.
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock, true);
            } else {
                // 자판의 배열정보를 새로 받아온다.
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock);
            }
        }
        if(ne.util.isArray(rawKeys)) {
            this._reArrangeKeys(rawKeys);
        }
    },

    /**
     * 자판을 재배열한다.
     */
    shuffle: function() {
        console.log('shuffle');
        // 기존 입력값 초기화
        this._keySequences.length = 0;
        this._initContainer();
        this._getRawKeys();
    },

    /**
     * 한/영 자판을 변환한다.
     */
    language: function() {
        console.log('language');
        this._initContainer();
        this._isEnglish = !this._isEnglish;
        this._currentKeyType = this._isEnglish ? 'english' : 'korean'
        this._getRawKeys();
    },

    /**
     * 대소문자 변환을 한다.
     */
    caps: function() {
        console.log('caps');
        this._initContainer();
        this._isCapsLock = !this._isCapsLock;
        this._getRawKeys(true);
    },

    /**
     * 특수키/숫자키 변환을 한다.
     */
    symbol: function() {
        console.log('symbol');
        this._initContainer();
        this._isSymbol = !this._isSymbol;
        this._currentKeyType = this._isSymbol ? 'symbol' : 'number';
        this._getRawKeys();
    },

    /**
     * 마지막으로 입력된 값을 삭제한다.
     */
    delete: function() {
        console.log('delete');
    },

    /**
     * 전체 입력값을 초기화한다.
     */
    clear: function() {
        console.log('clear');
    },

    /**
     * 공백문자를 입력한다.
     */
    space: function() {
        console.log('space');
        /**
         * @todo
         */
    },

    /**
     * 가상키보드를 연다.
     */
    open: function() {
        console.log('open');
        this.shuffle();
        this._$container.show();
    },

    /**
     * 가상키보드를 닫는다.
     */
    close: function() {
        console.log('close');
        this.clear();
        this._$container.hide();
    },

    /**
     * 완료버튼을 처리한다.
     */
    done: function() {
        console.log('done');
        this.close();
    }
});