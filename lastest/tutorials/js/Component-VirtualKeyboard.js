/*!Component-VirtualKeyboard v0.0.1 | NHN Entertainment*/
(function() {
/**********
 * browser.js
 **********/

/**
 * @fileoverview 클라이언트의 브라우저의 종류와 버전 검출을 위한 모듈
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 다음의 브라우저에 한하여 종류와 버전을 제공하는 모듈
     *
     * - ie7 ~ ie11
     * - chrome
     * - firefox
     * - safari
     *
     * @module browser
     * @example
     * if (browser.msie && browser.version === 7) {
     *     // IE7일 경우의 루틴
     * }
     *
     * if (browser.chrome && browser.version >= 32) {
     *     // Chrome 32버전 이상일 때의 루틴
     * }
     */
    var browser = {
        chrome: false,
        firefox: false,
        safari: false,
        msie: false,
        others: false,
        version: 0
    };

    var nav = window.navigator,
        appName = nav.appName.replace(/\s/g, '_'),
        userAgent = nav.userAgent;

    var rIE = /MSIE\s([0-9]+[.0-9]*)/,
        rIE11 = /Trident.*rv:11\./,
        versionRegex = {
            'firefox': /Firefox\/(\d+)\./,
            'chrome': /Chrome\/(\d+)\./,
            'safari': /Version\/([\d\.]+)\sSafari\/(\d+)/
        };

    var key, tmp;

    var detector = {
        'Microsoft_Internet_Explorer': function() {
            // ie8 ~ ie10
            browser.msie = true;
            browser.version = parseFloat(userAgent.match(rIE)[1]);
        },
        'Netscape': function() {
            var detected = false;

            if (rIE11.exec(userAgent)) {
                // ie11
                browser.msie = true;
                browser.version = 11;
            } else {
                // chrome, firefox, safari, others
                for (key in versionRegex) {
                    if (versionRegex.hasOwnProperty(key)) {
                        tmp = userAgent.match(versionRegex[key]);
                        if (tmp && tmp.length > 1) {
                            browser[key] = detected = true;
                            browser.version = parseFloat(tmp[1] || 0);
                            break;
                        }
                    }
                }
            }

            // 브라우저 검출 실패 시 others로 표기
            if (!detected) {
                browser.others = true;
            }
        }
    };

    detector[appName]();

    ne.util.browser = browser;

})(window.ne);

/**********
 * collection.js
 **********/

/**
 * @fileoverview 객체나 배열을 다루기위한 펑션들이 정의 되어있는 모듈
 * @author FE개발팀
 * @dependency type.js, object.js
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 배열나 유사배열를 순회하며 콜백함수에 전달한다.
     * 콜백함수가 false를 리턴하면 순회를 종료한다.
     * @param {Array} arr
     * @param {Function} iteratee  값이 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @example
     *
     * var sum = 0;
     *
     * forEachArray([1,2,3], function(value){
     *     sum += value;
     * });
     *
     * => sum == 6
     */
    function forEachArray(arr, iteratee, context) {
        var index = 0,
            len = arr.length;

        for (; index < len; index++) {
            if (iteratee.call(context || null, arr[index], index, arr) === false) {
                break;
            }
        }
    }


    /**
     * obj에 상속된 프로퍼티를 제외한 obj의 고유의 프로퍼티만 순회하며 콜백함수에 전달한다.
     * 콜백함수가 false를 리턴하면 순회를 중료한다.
     * @param {object} obj
     * @param {Function} iteratee  프로퍼티가 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @example
     * var sum = 0;
     *
     * forEachOwnProperties({a:1,b:2,c:3}, function(value){
     *     sum += value;
     * });
     *
     * => sum == 6
     **/
    function forEachOwnProperties(obj, iteratee, context) {
        var key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (iteratee.call(context || null, obj[key], key, obj) === false) {
                    break;
                }
            }
        }
    }

    /**
     * 파라메터로 전달된 객체나 배열를 순회하며 데이터를 콜백함수에 전달한다.
     * 유사배열의 경우 배열로 전환후 사용해야함.(ex2 참고)
     * 콜백함수가 false를 리턴하면 순회를 종료한다.
     * @param {*} obj 순회할 객체
     * @param {Function} iteratee 데이터가 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @example
     *
     * //ex1)
     * var sum = 0;
     *
     * forEach([1,2,3], function(value){
     *     sum += value;
     * });
     *
     * => sum == 6
     *
     * //ex2) 유사 배열사용
     * function sum(){
     *     var factors = Array.prototype.slice.call(arguments); //arguments를 배열로 변환, arguments와 같은정보를 가진 새 배열 리턴
     *
     *     forEach(factors, function(value){
     *          ......
     *     });
     * }
     *
     **/
    function forEach(obj, iteratee, context) {
        var key,
            len;

        if (ne.util.isArray(obj)) {
            for (key = 0, len = obj.length; key < len; key++) {
                iteratee.call(context || null, obj[key], key, obj);
            }
        } else {
            ne.util.forEachOwnProperties(obj, iteratee, context);
        }
    }

    /**
     * 파라메터로 전달된 객체나 배열를 순회하며 콜백을 실행한 리턴값을 배열로 만들어 리턴한다.
     * 유사배열의 경우 배열로 전환후 사용해야함.(forEach example참고)
     * @param {*} obj 순회할 객체
     * @param {Function} iteratee 데이터가 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @returns {Array}
     * @example
     * map([0,1,2,3], function(value) {
     *     return value + 1;
     * });
     *
     * => [1,2,3,4];
     */
    function map(obj, iteratee, context) {
        var resultArray = [];

        ne.util.forEach(obj, function() {
            resultArray.push(iteratee.apply(context || null, arguments));
        });

        return resultArray;
    }

    /**
     * 파라메터로 전달된 객체나 배열를 순회하며 콜백을 실행한 리턴값을 다음 콜백의 첫번째 인자로 넘겨준다.
     * 유사배열의 경우 배열로 전환후 사용해야함.(forEach example참고)
     * @param {*} obj 순회할 객체
     * @param {Function} iteratee 데이터가 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @returns {*}
     * @example
     * reduce([0,1,2,3], function(stored, value) {
     *     return stored + value;
     * });
     *
     * => 6;
     */
    function reduce(obj, iteratee, context) {
        var keys,
            index = 0,
            length,
            store;


        if (!ne.util.isArray(obj)) {
            keys = ne.util.keys(obj);
        }

        length = keys ? keys.length : obj.length;

        store = obj[keys ? keys[index++] : index++];

        for (; index < length; index++) {
            store = iteratee.call(context || null, store, obj[keys ? keys[index] : index]);
        }

        return store;
    }
    /**
     * 유사배열을 배열 형태로 변환한다.
     * - IE 8 이하 버전에서 Array.prototype.slice.call 이 오류가 나는 경우가 있어 try-catch 로 예외 처리를 한다.
     * @param {*} arrayLike 유사배열
     * @return {Array}
     * @example


     var arrayLike = {
        0: 'one',
        1: 'two',
        2: 'three',
        3: 'four',
        length: 4
    };
     var result = toArray(arrayLike);

     => ['one', 'two', 'three', 'four'];
     */
    function toArray(arrayLike) {
        var arr;
        try {
            arr = Array.prototype.slice.call(arrayLike);
        } catch (e) {
            arr = [];
            forEachArray(arrayLike, function(value) {
                arr.push(value);
            });
        }
        return arr;
    }

    /**
     * 파라메터로 전달된 객체나 어레이를 순회하며 콜백을 실행한 리턴값이 참일 경우의 모음을 만들어서 리턴한다.
     *
     * @param {*} obj 순회할 객체나 배열
     * @param {Function} iteratee 데이터가 전달될 콜백함수
     * @param {*} [context] 콜백함수의 컨텍스트
     * @returns {*}
     * @example
     * filter([0,1,2,3], function(value) {
     *     return (value % 2 === 0);
     * });
     *
     * => [0, 2];
     * filter({a : 1, b: 2, c: 3}, function(value) {
     *     return (value % 2 !== 0);
     * });
     *
     * => {a: 1, c: 3};
     */
    var filter = function(obj, iteratee, context) {
        var result = ne.util.isArray(obj) ? [] : {},
            value,
            key;

        if (!ne.util.isObject(obj) || !ne.util.isFunction(iteratee)) {
            throw new Error('wrong parameter');
        }

        ne.util.forEach(obj, function() {
            if (iteratee.apply(context || null, arguments)) {
                value = arguments[0];
                key = arguments[1];
                if (ne.util.isArray(obj)) {
                    result.push(value);
                } else {
                    result[key] = value;
                }
            }
        }, context);

        return result;
    };

    /**
     * 배열 내의 값을 찾아서 인덱스를 반환한다. 찾고자 하는 값이 없으면 -1 반환.
     * @param {*} value 배열 내에서 찾고자 하는 값
     * @param {array} array 검색 대상 배열
     * @param {number} fromIndex 검색이 시작될 배열 인덱스. 지정하지 않으면 기본은 0이고 전체 배열 검색.
     *
     * @return {number} targetValue가 발견된 array내에서의 index값
     * @example
     *
     *   var arr = ['one', 'two', 'three', 'four'];
     *   ne.util.inArray('one', arr, 3);
     *      => return -1;
     *
     *   ne.util.inArray('one', arr);
     *      => return 0
     */
    var inArray = function(value, array, fromIndex) {
        if (!ne.util.isArray(array)) {
            return -1;
        }

        if (Array.prototype.indexOf) {
            return Array.prototype.indexOf.call(array, value, fromIndex);
        }

        var i,
            index,
            arrLen = array.length;

        //fromIndex를 지정하되 array 길이보다 같거나 큰 숫자로 지정하면 오류이므로 -1을 리턴한다.
        if (ne.util.isUndefined(fromIndex)) {
            fromIndex = 0;
        } else if (fromIndex >= arrLen) {
            return -1;
        }

        //fromIndex값을 참고하여 배열을 순회할 시작index를 정한다.
        index = (fromIndex > -1) ? fromIndex : 0;

        //array에서 value 탐색하여 index반환
        for (i = index; i < arrLen; i++) {
            if (array[i] === value) {
                return i;
            }
        }

        return -1;
    };

    ne.util.forEachOwnProperties = forEachOwnProperties;
    ne.util.forEachArray = forEachArray;
    ne.util.forEach = forEach;
    ne.util.toArray = toArray;
    ne.util.map = map;
    ne.util.reduce = reduce;
    ne.util.filter = filter;
    ne.util.inArray = inArray;

})(window.ne);

/**********
 * customEvent.js
 **********/

/**
 * @fileoverview 옵저버 패턴을 이용하여 객체 간 커스텀 이벤트를 전달할 수 있는 기능을 제공하는 모듈
 * @author FE개발팀
 * @dependency type.js, collection.js object.js
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 이벤트 핸들러에 저장되는 단위
     * @typedef {object} eventItem
     * @property {object.<string, object>} eventObject
     * @property {function()} eventObject.fn 이벤트 핸들러 함수
     * @property {*} [eventObject.ctx] 이벤트 핸들러 실행 시 컨텍스트 지정가능
     */


    /**
     * 커스텀 이벤트 클래스
     * @constructor
     * @exports CustomEvents
     * @class
     */
    function CustomEvents() {

        /**
         * 이벤트 핸들러를 저장하는 객체
         * @type {object.<string, eventItem>}
         * @private
         */
        this._events = {};
    }

    var CustomEventMethod = /** @lends CustomEvents */ {
        /**
         * 인스턴스가 발생하는 이벤트에 핸들러를 등록하는 메서드
         * @param {(object|String)} types - 이벤트 타입 (타입과 함수 쌍으로 된 객체를 전달할 수도 있고 타입만
         * 전달할 수 있다. 후자의 경우 두 번째 인자에 핸들러를 전달해야 한다.)
         * @param {function()=} fn - 이벤트 핸들러 목록
         * @param {*=} context
         * @example
         * // 첫 번째 인자에 이벤트명:핸들러 데이터 객체를 넘긴 경우
         * instance.on({
         *     zoom: function() {},
         *     pan: function() {}
         * }, this);
         *
         * // 여러 이벤트를 한 핸들러로 처리할 수 있도록 함
         * instance.on('zoom pan', function() {});
         */
        on: function(types, fn, context) {
            this._toggle(true, types, fn, context);
        },

        /**
         * 인스턴스에 등록했던 이벤트 핸들러를 해제할 수 있다.
         * @param {(object|string)=} types 등록 해지를 원하는 이벤트 객체 또는 타입명. 아무 인자도 전달하지 않으면 모든 이벤트를 해제한다.
         * @param {Function=} fn 삭제할 핸들러, 핸들러를 전달하지 않으면 types 해당 이벤트가 모두 삭제된다.
         * @param {*=} context
         * @example
         * // zoom 이벤트만 해제
         * instance.off('zoom', onZoom);
         *
         * // pan 이벤트 해제 (이벤트 바인딩 시에 context를 넘겼으면 그대로 넘겨주어야 한다)
         * instance.off('pan', onPan, this);
         *
         * // 인스턴스 내 모든 이벤트 해제
         * instance.off();
         */
        off: function(types, fn, context) {
            if (!ne.util.isExisty(types)) {
                this._events = null;
                return;
            }

            this._toggle(false, types, fn, context);
        },

        /**
         * on, off 메서드의 중복 코드를 줄이기 위해 만든 on토글 메서드
         * @param {boolean} isOn
         * @param {(Object|String)} types - 이벤트 타입 (타입과 함수 쌍으로 된 객체를 전달할 수도 있고 타입만
         * 전달할 수 있다. 후자의 경우 두 번째 인자에 핸들러를 전달해야 한다.)
         * @param {function()=} fn - 이벤트 핸들러 목록
         * @param {*=} context
         * @private
         */
        _toggle: function(isOn, types, fn, context) {
            var methodName = isOn ? '_on' : '_off',
                method = this[methodName];

            if (ne.util.isObject(types)) {
                ne.util.forEachOwnProperties(types, function(handler, type) {
                    method.call(this, type, handler, fn);
                }, this);
            } else {
                types = types.split(' ');

                ne.util.forEach(types, function(type) {
                    method.call(this, type, fn, context);
                }, this);
            }
        },

        /**
         * 내부적으로 실제로 이벤트를 등록하는 로직을 담는 메서드.
         *
         * 옵션에 따라 이벤트를 배열에 등록하기도 하고 해시에 등록하기도 한다.
         *
         * 두개를 사용하는 기준:
         *
         * 핸들러가 이미 this바인딩이 되어 있고 핸들러를 사용하는 object가 같은 종류가 동시다발적으로 생성/삭제되는 경우에는 context인자를
         * 전달하여 해시의 빠른 접근 속도를 이용하는 것이 좋다.
         *
         * @param {(object.<string, function()>|string)} type - 이벤트 타입 (타입과 함수 쌍으로 된 객체를 전달할 수도 있고 타입만
         * 전달할 수 있다. 후자의 경우 두 번째 인자에 핸들러를 전달해야 한다.)
         * @param {function()} fn - 이벤트 핸들러
         * @param {*=} context
         * @private
         */
        _on: function(type, fn, context) {
            var events = this._events = this._events || {},
                contextId = context && (context !== this) && ne.util.stamp(context);

            if (contextId) {
                /*
                 context가 현재 인스턴스와 다를 때 context의 아이디로 내부의 해시에서 빠르게 해당 핸들러를 컨트롤 하기 위한 로직.
                 이렇게 하면 동시에 많은 이벤트를 발생시키거나 제거할 때 성능면에서 많은 이점을 제공한다.
                 특히 동시에 많은 엘리먼트들이 추가되거나 해제될 때 도움이 될 수 있다.
                 */
                var indexKey = type + '_idx',
                    indexLenKey = type + '_len',
                    typeIndex = events[indexKey] = events[indexKey] || {},
                    id = ne.util.stamp(fn) + '_' + contextId; // 핸들러의 id + context의 id

                if (!typeIndex[id]) {
                    typeIndex[id] = {
                        fn: fn,
                        ctx: context
                    };

                    // 할당된 이벤트의 갯수를 추적해 두고 할당된 핸들러가 없는지 여부를 빠르게 확인하기 위해 사용한다
                    events[indexLenKey] = (events[indexLenKey] || 0) + 1;
                }
            } else {
                // fn이 이미 this 바인딩이 된 상태에서 올 경우 단순하게 처리해준다
                events[type] = events[type] || [];
                events[type].push({fn: fn});
            }
        },

        /**
         * 실제로 구독을 해제하는 메서드
         * @param {(object|string)=} type 등록 해지를 원하는 핸들러명
         * @param {function} [fn]
         * @param {*} context
         * @private
         */
        _off: function(type, fn, context) {
            var events = this._events,
                indexKey = type + '_idx',
                indexLenKey = type + '_len';

            if (!events) {
                return;
            }

            var contextId = context && (context !== this) && ne.util.stamp(context),
                listeners,
                id;

            if (contextId) {
                id = ne.util.stamp(fn) + '_' + contextId;
                listeners = events[indexKey];

                if (listeners && listeners[id]) {
                    listeners[id] = null;
                    events[indexLenKey] -= 1;
                }

            } else if(!fn) {
                events[type] = null;
            } else {
                listeners = events[type];

                if (listeners) {
                    if(fn){
                        ne.util.forEach(listeners, function(listener, index) {
                            if (ne.util.isExisty(listener) && (listener.fn === fn)) {
                                listeners.splice(index, 1);
                                return true;
                            }
                        });
                    }
                }
            }
        },

        /**
         * 이벤트를 발생시키는 메서드
         *
         * 등록한 리스너들의 실행 결과를 boolean AND 연산하여
         *
         * 반환한다는 점에서 {@link CustomEvents#fire} 와 차이가 있다
         *
         * 보통 컴포넌트 레벨에서 before 이벤트로 사용자에게
         *
         * 이벤트를 취소할 수 있게 해 주는 기능에서 사용한다.
         * @param {string} type
         * @param {*...} data
         * @returns {*}
         * @example
         * // 확대 기능을 지원하는 컴포넌트 내부 코드라 가정
         * if (this.invoke('beforeZoom')) {    // 사용자가 등록한 리스너 결과 체크
         *     // 리스너의 실행결과가 true 일 경우
         *     // doSomething
         * }
         *
         * //
         * // 아래는 사용자의 서비스 코드
         * map.on({
         *     'beforeZoom': function() {
         *         if (that.disabled && this.getState()) {    //서비스 페이지에서 어떤 조건에 의해 이벤트를 취소해야한다
         *             return false;
         *         }
         *         return true;
         *     }
         * });
         */
        invoke: function(type, data) {
            if (!this.hasListener(type)) {
                return true;
            }

            var args = Array.prototype.slice.call(arguments, 1),
                events = this._events;

            if (!events) {
                return true;
            }

            var typeIndex = events[type + '_idx'],
                listeners,
                result = true;

            if (events[type]) {
                listeners = events[type].slice();

                ne.util.forEach(listeners, function(listener) {
                    if (listener.fn.apply(this, args) === false) {
                        result = false;
                    }
                }, this);
            }

            ne.util.forEachOwnProperties(typeIndex, function(eventItem) {
                if (eventItem.fn.apply(eventItem.ctx, args) === false) {
                    result = false;
                }
            });

            return result;
        },

        /**
         * 이벤트를 발생시키는 메서드
         * @param {string} type 이벤트 타입명
         * @param {(object|string)=} data 발생과 함께 전달할 이벤트 데이터
         * @return {*}
         * @example
         * instance.fire('move', { direction: 'left' });
         *
         * // 이벤트 핸들러 처리
         * instance.on('move', function(moveEvent) {
         *     var direction = moveEvent.direction;
         * });
         */
        fire: function(type, data) {
            this.invoke.apply(this, arguments);
            return this;
        },

        /**
         * 이벤트 핸들러 존재 여부 확인
         * @param {string} type 핸들러명
         * @return {boolean}
         */
        hasListener: function(type) {
            var events = this._events,
                existyFunc = ne.util.isExisty;

            return existyFunc(events) && (existyFunc(events[type]) || events[type + '_len']);
        },

        /**
         * 등록된 이벤트 핸들러의 갯수 반환
         * @param {string} type
         * @returns {number}
         */
        getListenerLength: function(type) {
            var events = this._events,
                lenKey = type + '_len',
                length = 0,
                types,
                len;

            if (!ne.util.isExisty(events)) {
                return 0;
            }

            types = events[type];
            len = events[lenKey];

            length += (ne.util.isExisty(types) && ne.util.isArray(types)) ? types.length : 0;
            length += ne.util.isExisty(len) ? len : 0;

            return length;
        },

        /**
         * 단발성 커스텀 이벤트 핸들러 등록 시 사용
         * @param {(object|string)} types 이벤트명:핸들러 객체 또는 이벤트명
         * @param {function()=} fn 핸들러 함수
         * @param {*=} context
         */
        once: function(types, fn, context) {
            var that = this;

            if (ne.util.isObject(types)) {
                ne.util.forEachOwnProperties(types, function(handler, type) {
                    this.once(type, handler, fn);
                }, this);

                return;
            }

            function onceHandler() {
                fn.apply(context, arguments);
                that.off(types, onceHandler, context);
            }

            this.on(types, onceHandler, context);
        }

    };

    CustomEvents.prototype = CustomEventMethod;
    CustomEvents.prototype.constructor = CustomEvents;

    /**
     * 커스텀 이벤트 기능을 믹스인할 때 사용하는 메서드
     * @param {function()} func 생성자 함수
     * @example
     * // 모델 클래스 변경 시 컨트롤러에게 알림을 주고 싶은데
     * // 그 기능을 모델 클래스 자체에게 주고 싶다
     * function Model() {}
     *
     * // 커스텀 이벤트 믹스인
     * ne.util.CustomEvents.mixin(Model);
     *
     * var model = new Model();
     *
     * model.on('changed', function() {}, this);
     */
    CustomEvents.mixin = function(func) {
        ne.util.extend(func.prototype, CustomEventMethod);
    };

    ne.util.CustomEvents = CustomEvents;

})(window.ne);

/**********
 * defineClass.js
 **********/

/**
 * @fileoverview 클래스와 비슷한방식으로 생성자를 만들고 상속을 구현할 수 있는 메소드를 제공하는 모듈
 * @author FE개발팀
 * @dependency inheritance.js, object.js
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 객체의 생성및 상속을 편하게 도와주는 메소드
     * @param {*} [parent] 상속받을 생성자.
     * @param {Object} props 생성할 생성자의프로토타입에 들어갈 멤버들
     * @param {Function} props.init 인스턴스가 생성될때 실행됨
     * @param {Object} props.static 생성자의 클래스 맴버형태로 들어갈 멤버들
     * @returns {*}
     * @example
     *
     * var Parent = defineClasss({
     *     init: function() {
     *         this.name = 'made by def';
     *     },
     *     method: function() {
     *         //..can do something with this
     *     },
     *     static: {
     *         staticMethod: function() {
     *              //..do something
     *         }
     *     }
     * });
     *
     * var Child = defineClass(Parent, {
     *     method2: function() {}
     * });
     *
     *
     * Parent.staticMethod();
     *
     * var parentInstance = new Parent();
     * console.log(parentInstance.name); //made by def
     * parentInstance.staticMethod(); // Error
     *
     *
     * var childInstance = new Child();
     * childInstance.method();
     * childInstance.method2();
     *
     *
     */
    var defineClass = function(parent, props) {
        var obj;

        if (!props) {
            props = parent;
            parent = null;
        }

        obj = props.init || function(){};

        parent && ne.util.inherit(obj, parent);

        if (props.hasOwnProperty('static')) {
            ne.util.extend(obj, props.static);
            delete props.static;
        }

        ne.util.extend(obj.prototype, props);

        return obj;
    };

    ne.util.defineClass = defineClass;

})(window.ne);

/**********
 * form.js
 **********/

/**
 * @fileoverview Form 엘리먼트 헨들링 메서드
 * @author FE개발팀
 * @dependency jquery-1.8.3.js, collection.js, type.js
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * form 의 input 요소 값을 설정하기 위한 객체
     */
    var setInput = {
        /**
         * radio type 의 input 요소의 값을 설정한다.
         * @param {HTMLElement} targetElement
         * @param {String} formValue
         */
        'radio': function(targetElement, formValue) {
            targetElement.checked = (targetElement.value === formValue);
        },
        /**
         * radio type 의 input 요소의 값을 설정한다.
         * @param {HTMLElement} targetElement
         * @param {String} formValue
         */
        'checkbox': function(targetElement, formValue) {
            if (ne.util.isArray(formValue)) {
                targetElement.checked = $.inArray(targetElement.value, _changeToStringInArray(formValue)) !== -1;
            } else {
                targetElement.checked = (targetElement.value === formValue);
            }
        },
        /**
         * select-one type 의 input 요소의 값을 설정한다.
         * @param {HTMLElement} targetElement
         * @param {String} formValue
         */
        'select-one': function(targetElement, formValue) {
            var options = ne.util.toArray(targetElement.options),
                index = -1;

            ne.util.forEach(options, function(targetOption, i) {
                if (targetOption.value === formValue || targetOption.text === formValue) {
                    index = i;
                    return false;
                }
            }, this);

            targetElement.selectedIndex = index;

        },
        /**
         * select-multiple type 의 input 요소의 값을 설정한다.
         * @param {HTMLElement} targetElement
         * @param {String|Array} formValue
         */
        'select-multiple': function(targetElement, formValue) {
            var options = ne.util.toArray(targetElement.options);

            if (ne.util.isArray(formValue)) {
                formValue = _changeToStringInArray(formValue);
                ne.util.forEach(options, function(targetOption) {
                    targetOption.selected = $.inArray(targetOption.value, formValue) !== -1 ||
                        $.inArray(targetOption.text, formValue) !== -1;
                }, this);
            } else {
                this['select-one'].apply(this, arguments);
            }
        },
        /**
         * input 요소의 값을 설정하는 default 로직
         * @param {HTMLElement} targetElement
         * @param {String} formValue
         */
        'defaultAction': function(targetElement, formValue) {
            targetElement.value = formValue;
        }
    };
    /**
     * 배열의 값들을 전부 String 타입으로 변환한다.
     * @private
     * @param {Array}  arr 변환할 배열
     * @return {Array} 변환된 배열 결과 값
     */
    function _changeToStringInArray(arr) {
        ne.util.forEach(arr, function(value, i) {
            arr[i] = String(value);
        }, this);
        return arr;
    }


    /**
     * $form 에 정의된 인풋 엘리먼트들의 값을 모아서 DataObject 로 구성하여 반환한다.
     * @param {jQuery} $form jQuery()로 감싼 폼엘리먼트
     * @return {object} form 내의 데이터들을 key:value 형태의 DataObject 로 반환한다.
     **/
    function getFormData($form) {
        var result = {},
            valueList = $form.serializeArray();

        ne.util.forEach(valueList, function(obj) {
            var value = obj.value,
                name = obj.name;
            if (ne.util.isExisty(result[name])) {
                if (!result[name].push) {
                    result[name] = [result[name]];
                }
                result[name].push(value || '');
            } else {
                result[name] = value || '';
            }
        }, this);

        return result;
    }
    /**
     * 폼 안에 있는 모든 인풋 엘리먼트를 배열로 리턴하거나, elementName에 해당하는 인풋 엘리먼트를 리턴한다.
     * @method getFormElement
     * @param {jquery} $form jQuery()로 감싼 폼엘리먼트
     * @param {String} [elementName] 특정 이름의 인풋 엘리먼트만 가져오고 싶은 경우 전달하며, 생략할 경우 모든 인풋 엘리먼트를 배열 형태로 리턴한다.
     * @return {jQuery}  jQuery 로 감싼 엘리먼트를 반환한다.
     */
    function getFormElement($form, elementName) {
        var formElement;
        if ($form && $form.length) {
            if (elementName) {
                formElement = $form.prop('elements')[elementName + ''];
            } else {
                formElement = $form.prop('elements');
            }
        }
        return $(formElement);
    }
    /**
     * 파라미터로 받은 데이터 객체를 이용하여 폼내에 해당하는 input 요소들의 값을 설정한다.
     *
     * @method setFormData
     * @param {jQuery} $form jQuery()로 감싼 폼엘리먼트
     * @param {Object} formData 폼에 설정할 폼 데이터 객체
     **/
    function setFormData($form, formData) {
        ne.util.forEachOwnProperties(formData, function(value, property) {
            setFormElementValue($form, property, value);
        }, this);
    }
    /**
     * elementName에 해당하는 인풋 엘리먼트에 formValue 값을 설정한다.
     * -인풋 엘리먼트의 이름을 기준으로 하기에 라디오나 체크박스 엘리먼트에 대해서도 쉽게 값을 설정할 수 있다.
     * @param {jQuery} $form jQuery()로 감싼 폼엘리먼트
     * @param {String}  elementName 값을 설정할 인풋 엘리먼트의 이름
     * @param {String|Array} formValue 인풋 엘리먼트에 설정할 값으로 체크박스나 멀티플 셀렉트박스인 경우에는 배열로 설정할 수 있다.
     **/
    function setFormElementValue($form, elementName, formValue) {
        var type,
            elementList = getFormElement($form, elementName);

        if (!elementList) {
            return;
        }
        if (!ne.util.isArray(formValue)) {
            formValue = String(formValue);
        }
        elementList = ne.util.isHTMLTag(elementList) ? [elementList] : elementList;
        elementList = ne.util.toArray(elementList);
        ne.util.forEach(elementList, function(targetElement) {
            type = setInput[targetElement.type] ? targetElement.type : 'defaultAction';
            setInput[type](targetElement, formValue);
        }, this);
    }
    /**
     * input 타입의 엘리먼트의 커서를 가장 끝으로 이동한다.
     * @param {HTMLElement} target HTML input 엘리먼트
     */
    function setCursorToEnd(target) {
        target.focus();
        var length = target.value.length;

        if (target.setSelectionRange) {
            target.setSelectionRange(length, length);
        } else if (target.createTextRange) {
            var range = target.createTextRange();
            range.collapse(true);
            range.moveEnd('character', length);
            range.moveStart('character', length);
            range.select();
        }
    }

    ne.util.getFormElement = getFormElement;
    ne.util.getFormData = getFormData;
    ne.util.setFormData = setFormData;
    ne.util.setFormElementValue = setFormElementValue;
    ne.util.setCursorToEnd = setCursorToEnd;
})(window.ne);
/**********
 * func.js
 **********/

/**
 * @fileoverview 함수관련 메서드 모음
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 커링 메서드
     * @param {function()} fn
     * @param {*} obj - this로 사용될 객체
     * @return {function()}
     */
    function bind(fn, obj) {
        var slice = Array.prototype.slice;

        if (fn.bind) {
            return fn.bind.apply(fn, slice.call(arguments, 1));
        }

        /* istanbul ignore next */
        var args = slice.call(arguments, 2);

        /* istanbul ignore next */
        return function() {
            /* istanbul ignore next */
            return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
        };
    }

    ne.util.bind = bind;

})(window.ne);

/**********
 * hashMap.js
 **********/

/**
 * @fileoverview Hash Map을 구현한 모듈이 정의 되어있다.
 * @author FE개발팀
 * @dependency type, collection.js
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 해쉬맵에서 사용하는 데이터는 _MAPDATAPREFIX로 시작한다.
     * @type {string}
     * @private
     */
    var _MAPDATAPREFIX = 'å';

    /**
     * HashMap
     * 키/밸류로 데이터를 관리할수있다(자바의 hashMap과 유사)
     * 주의) length프로퍼티를 가지고있어 유사 배열을 length의 유무로 체크하는 로직에서 의도되지 않은 동작을 할수있다.
     * @param {Object} [obj] 인스턴스가 만들어질때 셋팅할 초기 데이터
     * @constructor
     * @example
     * var hm = new HashMap({
     *     'mydata': {
     *          'hello': 'imfine'
     *      },
     *     'what': 'time'
     * });
     */
    function HashMap(obj) {
        /**
         * 사이즈
         * @type {number}
         */
        this.length = 0;

        if (obj) {
            this.setObject(obj);
        }
    }

    /**
     * 키/밸류 혹은 Object를 전달하여 데이터를 셋팅한다.
     * @param {String|Object} key 키에 해당하는 스트링이나 객체
     * @param {*} [value] 데이터
     * @example
     * var hm = new HashMap();
     *
     * hm.set('key', 'value');
     * hm.set({
     *     'key1': 'data1',
     *     'key2': 'data2'
     * });
     */
    HashMap.prototype.set = function(key, value) {
        arguments.length === 2 ? this.setKeyValue(key, value) : this.setObject(key);
    };

    /**
     * 키/밸류로 데이터를 셋팅한다.
     * @param {String} key 키스트링
     * @param {*} value 데이터
     * @example
     * var hm = new HashMap();
     * hm.setKeyValue('key', 'value');
     */
    HashMap.prototype.setKeyValue = function(key, value) {
        if (!this.has(key)) {
            this.length += 1;
        }
        this[this.encodeKey(key)] = value;
    };

    /**
     * 객체로 데이터를 셋팅한다.
     * @param {Object} obj
     * @example
     * var hm = new HashMap();
     *
     * hm.setObject({
     *     'key1': 'data1',
     *     'key2': 'data2'
     * });
     */
    HashMap.prototype.setObject = function(obj) {
        var self = this;

        ne.util.forEachOwnProperties(obj, function(value, key) {
            self.setKeyValue(key, value);
        });
    };

    /**
     * 해쉬맵을 인자로 받아 병합한다.
     * @param {HashMap} hashMap
     */
    HashMap.prototype.merge = function(hashMap) {
        var self = this;

        hashMap.each(function(value, key) {
            self.setKeyValue(key, value);
        });
    };

    /**
     * 해쉬맵에서 사용할 키를 생성한다.
     * @param {String} key
     * @returns {string}
     * @private
     */
    HashMap.prototype.encodeKey = function(key) {
        return _MAPDATAPREFIX + key;
    };

    /**
     * 해쉬맵키에서 실제 키를 가져온다.
     * @param {String} key
     * @returns {String}
     * @private
     */
    HashMap.prototype.decodeKey = function(key) {
        var decodedKey = key.split(_MAPDATAPREFIX);
        return decodedKey[decodedKey.length-1];
    };

    /**
     * 키값을 전달하여 데이터를 반환한다.
     * @param {String} key
     * @returns {*}
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     *
     * hm.get('key') // value
     */
    HashMap.prototype.get = function(key) {
        return this[this.encodeKey(key)];
    };

    /**
     * 키를 전달하여 데이터가 존재하는지 체크한다.
     * @param {String} key
     * @returns {boolean}
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     *
     * hm.has('key') // true
     */
    HashMap.prototype.has = function(key) {
        return this.hasOwnProperty(this.encodeKey(key));
    };

    /**
     * 키나 키의 목록을 전달하여 데이터를 삭제한다.
     * @param {String...|String[]} key
     * @returns {String|String[]}
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     * hm.set('key2', 'value');
     *
     * //ex1
     * hm.remove('key');
     *
     * //ex2
     * hm.remove('key', 'key2');
     *
     * //ex3
     * hm.remove(['key', 'key2']);
     */
    HashMap.prototype.remove = function(key) {
        if (arguments.length > 1) {
            key = ne.util.toArray(arguments);
        }

        return ne.util.isArray(key) ? this.removeByKeyArray(key) : this.removeByKey(key);
    };

    /**
     * 키를 전달하여 데이터를 삭제한다.
     * @param {String} key
     * @returns {*|null} 삭제된 데이터
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     *
     * hm.removeByKey('key')
     */
    HashMap.prototype.removeByKey = function(key) {
        var data = this.has(key) ? this.get(key) : null;

        if (data !== null) {
            delete this[this.encodeKey(key)];
            this.length -= 1;
        }

        return data;
    };

    /**
     * 키의 목록을 전달하여 데이터를 삭제한다.
     * @param {String[]} keyArray
     * @returns {String[]} 삭제된 데이터
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     * hm.set('key2', 'value');
     *
     * hm.removeByKeyArray(['key', 'key2']);
     */
    HashMap.prototype.removeByKeyArray = function(keyArray) {
        var data = [],
            self = this;

        ne.util.forEach(keyArray, function(key) {
            data.push(self.removeByKey(key));
        });

        return data;
    };

    /**
     * 모든데이터를 지운다.
     */
    HashMap.prototype.removeAll = function() {
        var self = this;

        this.each(function(value, key) {
            self.remove(key);
        });
    };

    /**
     * 데이터를 순회하며 콜백에 전달해준다.
     * @param {Function} iteratee
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     * hm.set('key2', 'value');
     *
     * hm.each(function(value, key) {
     *     //do something...
     * });
     */
    HashMap.prototype.each = function(iteratee) {
        var self = this,
            flag;

        ne.util.forEachOwnProperties(this, function(value, key) {
            if (key.charAt(0) === _MAPDATAPREFIX) {
                flag = iteratee(value, self.decodeKey(key));
            }

            if (flag === false) {
                return flag;
            }
        });
    };

    /**
     * 저장된 키의 목록을 배열로 리턴해준다.
     * @returns {Array}
     * @example
     * var hm = new HashMap();
     * hm.set('key', 'value');
     * hm.set('key2', 'value');
     *
     * hm.keys();  //['key', 'key2');
     */
    HashMap.prototype.keys = function() {
        var keys = [],
            self = this;

        this.each(function(value, key) {
            keys.push(self.decodeKey(key));
        });

        return keys;
    };

    /**
     * 조건을 체크하는 콜백을 전달받아 데이터를 전달해주고 콜백의 결과가 true인경우의 데이터를 모와 배열로 만들어 리턴해준다.
     * @param {Function} condition
     * @returns {Array}
     * @example
     *
     * //ex1
     * var hm = new HashMap();
     * hm.set('key', 'value');
     * hm.set('key2', 'value');
     *
     * hm.find(function(value, key) {
     *     return key === 'key2';
     * }); // ['value']
     *
     * //ex2
     * var hm = new HashMap({
     *     'myobj1': {
     *          visible: true
     *      },
     *     'mybobj2': {
     *          visible: false
     *      }
     * });
     *
     * hm.find(function(obj, key) {
     *     return obj.visible === true;
     * }); // [{visible: true}];
     */
    HashMap.prototype.find = function(condition) {
        var founds = [];

        this.each(function(value, key) {
            if (condition(value, key)) {
                founds.push(value);
            }
        });

        return founds;
    };

    /**
     * 내부의 값들을 순서에 상관없이 배열로 반환한다
     * @returns {Array}
     */
    HashMap.prototype.toArray = function() {
        var result = [];

        this.each(function(v, i) {
            result.push(v);
        });

        return result;
    };

    ne.util.HashMap = HashMap;

})(window.ne);

/**********
 * inheritance.js
 **********/

/**
 * @fileoverview 간단한 상속 시뮬레이션
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 전달된 객체를 prototype으로 사용하는 객체를 만들어 반환하는 메서드
     * @param {Object} obj
     * @return {Object}
     */
    function createObject() {
        function F() {}

        return function(obj) {
            F.prototype = obj;
            return new F;
        };
    }

    /**
     * 단순 prototype 확장을 응용한 상속 메서드
     *
     * **주의점**
     *
     * 단순 프로토타입 확장 기능만 제공하므로 자식 생성자의 prototype을 덮어쓰면 안된다.
     *
     * @example
     * function Animal(leg) {
     *     this.leg = leg;
     * }
     *
     * Animal.prototype.growl = function() {
     *     // ...
     * };
     *
     * function Person(name) {
     *     this.name = name;
     * }
     *
     * // 상속
     * core.inherit(Person, Animal);
     *
     * // 이 이후부터는 프로퍼티 편집만으로 확장해야 한다.
     * Person.prototype.walk = function(direction) {
     *     // ...
     * };
     * @param {function} subType 자식 생성자 함수
     * @param {function} superType 부모 생성자 함수
     */
    function inherit(subType, superType) {
        var prototype = ne.util.createObject(superType.prototype);
        prototype.constructor = subType;
        subType.prototype = prototype;
    }

    ne.util.createObject = createObject();
    ne.util.inherit = inherit;

})(window.ne);

/**********
 * layer.js
 **********/

/**
 * @fileoverview
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }
})(window.ne);
/**********
 * object.js
 **********/

/**
 * @fileoverview
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 데이터 객체를 확장하는 메서드 (deep copy 는 하지 않는다)
     * @param {object} target - 확장될 객체
     * @param {...object} objects - 프로퍼티를 복사할 객체들
     * @return {object}
     */
    function extend(target, objects) {
        var source,
            prop,
            hasOwnProp = Object.prototype.hasOwnProperty,
            i,
            len;

        for (i = 1, len = arguments.length; i < len; i++) {
            source = arguments[i];
            for (prop in source) {
                if (hasOwnProp.call(source, prop)) {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    }

    /**
     * @type {number}
     */
    var lastId = 0;

    /**
     * 객체에 unique한 ID를 프로퍼티로 할당한다.
     * @param {object} obj - ID를 할당할 객체
     * @return {number}
     */
    function stamp(obj) {
        obj.__fe_id = obj.__fe_id || ++lastId;
        return obj.__fe_id;
    }

    function resetLastId() {
        lastId = 0;
    }

    /**
     * 객체를 전달받아 객체의 키목록을 배열로만들어 리턴해준다.
     * @param obj
     * @returns {Array}
     */
    var keys = function(obj) {
        var keys = [],
            key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }

        return keys;
    };


    /**
     *
     * 여러개의 json객체들을 대상으로 그것들이 동일한지 비교하여 리턴한다.
     * (출처) http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
     *
     * @param {...object} object 비교할 객체 목록
     * @return {boolean} 파라미터로 전달받은 json객체들의 동일 여부
     * @example
     *
     var jsonObj1 = {name:'milk', price: 1000},
     jsonObj2 = {name:'milk', price: 1000},
     jsonObj3 = {name:'milk', price: 1000}

     ne.util.compareJSON(jsonObj1, jsonObj2, jsonObj3);
     => return true

     var jsonObj4 = {name:'milk', price: 1000},
     jsonObj5 = {name:'beer', price: 3000}

     ne.util.compareJSON(jsonObj4, jsonObj5);
     => return false
     */
    function compareJSON(object) {
        var leftChain,
            rightChain,
            argsLen = arguments.length,
            i;

        function isSameObject(x, y) {
            var p;

            // remember that NaN === NaN returns false
            // and isNaN(undefined) returns true
            if (isNaN(x) &&
                isNaN(y) &&
                ne.util.isNumber(x) &&
                ne.util.isNumber(y)) {
                return true;
            }

            // Compare primitives and functions.
            // Check if both arguments link to the same object.
            // Especially useful on step when comparing prototypes
            if (x === y) {
                return true;
            }

            // Works in case when functions are created in constructor.
            // Comparing dates is a common scenario. Another built-ins?
            // We can even handle functions passed across iframes
            if ((ne.util.isFunction(x) && ne.util.isFunction(y)) ||
                (x instanceof Date && y instanceof Date) ||
                (x instanceof RegExp && y instanceof RegExp) ||
                (x instanceof String && y instanceof String) ||
                (x instanceof Number && y instanceof Number)) {
                return x.toString() === y.toString();
            }

            // At last checking prototypes as good a we can
            if (!(x instanceof Object && y instanceof Object)) {
                return false;
            }

            if (x.isPrototypeOf(y) ||
                y.isPrototypeOf(x) ||
                x.constructor !== y.constructor ||
                x.prototype !== y.prototype) {
                return false;
            }

            // check for infinitive linking loops
            if (ne.util.inArray(x, leftChain) > -1 ||
                ne.util.inArray(y, rightChain) > -1) {
                return false;
            }

            // Quick checking of one object beeing a subset of another.
            for (p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                }
                else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }
            }

            //인풋 데이터 x의 오브젝트 키값으로 값을 순회하면서
            //hasOwnProperty, typeof 체크를 해서 비교하고 x[prop]값과 y[prop] 가 같은 객체인지 판별한다.
            for (p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                }
                else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }

                if (typeof(x[p]) === 'object' || typeof(x[p]) === 'function') {
                    leftChain.push(x);
                    rightChain.push(y);

                    if (!isSameObject(x[p], y[p])) {
                        return false;
                    }

                    leftChain.pop();
                    rightChain.pop();
                } else if (x[p] !== y[p]) {
                    return false;
                }
            }

            return true;
        }

        if (argsLen < 1) {
            return true;
        }

        for (i = 1; i < argsLen; i++) {
            leftChain = [];
            rightChain = [];

            if (!isSameObject(arguments[0], arguments[i])) {
                return false;
            }
        }

        return true;
    }

    ne.util.extend = extend;
    ne.util.stamp = stamp;
    ne.util._resetLastId = resetLastId;
    ne.util.keys = Object.keys || keys;
    ne.util.compareJSON = compareJSON;
})(window.ne);

/**********
 * simulation.js
 **********/

/**
 * @fileoverview
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }
})(window.ne);

/**********
 * string.js
 **********/

/**
 * @fileoverview 문자열 조작 모듈
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 전달된 문자열에 모든 HTML Entity 타입의 문자열을 원래의 문자로 반환
     * @method decodeHTMLEntity
     * @param {String} htmlEntity HTML Entity 타입의 문자열
     * @return {String} 원래 문자로 변환된 문자열
     * @example
     var htmlEntityString = "A &#39;quote&#39; is &lt;b&gt;bold&lt;/b&gt;"
     var result = decodeHTMLEntity(htmlEntityString); //결과값 : "A 'quote' is <b>bold</b>"
     */
    function decodeHTMLEntity(htmlEntity) {
        var entities = {'&quot;' : '"', '&amp;' : '&', '&lt;' : '<', '&gt;' : '>', '&#39;' : '\'', '&nbsp;' : ' '};
        return htmlEntity.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, function(m0) {
            return entities[m0] ? entities[m0] : m0;
        });
    }
    /**
     * 전달된 문자열을 HTML Entity 타입의 문자열로 반환
     * @method encodeHTMLEntity
     * @param {String} html HTML 문자열
     * @return {String} HTML Entity 타입의 문자열로 변환된 문자열
     * @example
     var htmlEntityString = "<script> alert('test');</script><a href='test'>";
     var result = encodeHTMLEntity(htmlEntityString);
     //결과값 : "&lt;script&gt; alert(&#39;test&#39;);&lt;/script&gt;&lt;a href=&#39;test&#39;&gt;"
     */
    function encodeHTMLEntity(html) {
        var entities = {'"': 'quot', '&': 'amp', '<': 'lt', '>': 'gt', '\'': '#39'};
        return html.replace(/[<>&"']/g, function(m0) {
            return entities[m0] ? '&' + entities[m0] + ';' : m0;
        });
    }
    /**
     * html Entity 로 변환할 수 있는 문자가 포함되었는지 확인
     * @param {String} string
     * @return {boolean}
     */
    function hasEncodableString(string) {
        return /[<>&"']/.test(string);
    }

    ne.util.decodeHTMLEntity = decodeHTMLEntity;
    ne.util.encodeHTMLEntity = encodeHTMLEntity;
    ne.util.hasEncodableString = hasEncodableString;
})(window.ne);

/**********
 * type.js
 **********/

/**
 * @fileoverview 타입체크 모듈
 * @author FE개발팀
 */

(function(ne) {
    'use strict';
    /* istanbul ignore if */
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    /**
     * 값이 정의되어 있는지 확인(null과 undefined가 아니면 true를 반환한다)
     * @param {*} obj
     * @param {(String|Array)} [key]
     * @returns {boolean}
     * @example
     *
     * var obj = {a: {b: {c: 1}}};
     * a 가 존재하는지 확인한다(존재함, true반환)
     * ne.util.isExisty(a);
     * => true;
     * a 에 속성 b 가 존재하는지 확인한다.(존재함, true반환)
     * ne.util.isExisty(a, 'b');
     * => true;
     * a 의 속성 b에 c가 존재하는지 확인한다.(존재함, true반환)
     * ne.util.isExisty(a, 'b.c');
     * => true;
     * a 의 속성 b에 d가 존재하는지 확인한다.(존재하지 않음, false반환)
     * ne.util.isExisty(a, 'b.d');
     * => false;
     */
    function isExisty(obj, key) {
        if (arguments.length < 2) {
            return !isNull(obj) && !isUndefined(obj);
        }
        if (!isObject(obj)) {
            return false;
        }

        key = isString(key) ? key.split('.') : key;

        if (!isArray(key)) {
            return false;
        }
        key.unshift(obj);

        var res = ne.util.reduce(key, function(acc, a) {
            if (!acc) {
                return;
            }
            return acc[a];
        });
        return !isNull(res) && !isUndefined(res);
    }

    /**
     * 인자가 undefiend 인지 체크하는 메서드
     * @param obj
     * @returns {boolean}
     */
    function isUndefined(obj) {
        return obj === undefined;
    }

    /**
     * 인자가 null 인지 체크하는 메서드
     * @param {*} obj
     * @returns {boolean}
     */
    function isNull(obj) {
        return obj === null;
    }

    /**
     * 인자가 null, undefined, false가 아닌지 확인하는 메서드
     * (0도 true로 간주한다)
     *
     * @param {*} obj
     * @return {boolean}
     */
    function isTruthy(obj) {
        return isExisty(obj) && obj !== false;
    }

    /**
     * 인자가 null, undefined, false인지 확인하는 메서드
     * (truthy의 반대값)
     * @param {*} obj
     * @return {boolean}
     */
    function isFalsy(obj) {
        return !isTruthy(obj);
    }


    var toString = Object.prototype.toString;

    /**
     * 인자가 arguments 객체인지 확인
     * @param {*} obj
     * @return {boolean}
     */
    function isArguments(obj) {
        var result = isExisty(obj) &&
            ((toString.call(obj) === '[object Arguments]') || 'callee' in obj);

        return result;
    }

    /**
     * 인자가 배열인지 확인
     * @param {*} obj
     * @return {boolean}
     */
    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    /**
     * 인자가 객체인지 확인하는 메서드
     * @param {*} obj
     * @return {boolean}
     */
    function isObject(obj) {
        return obj === Object(obj);
    }

    /**
     * 인자가 함수인지 확인하는 메서드
     * @param {*} obj
     * @return {boolean}
     */
    function isFunction(obj) {
        return toString.call(obj) === '[object Function]';
    }

    /**
     * 인자가 숫자인지 확인하는 메서드
     * @param {*} obj
     * @return {boolean}
     */
    function isNumber(obj) {
        return toString.call(obj) === '[object Number]';
    }

    /**
     * 인자가 문자열인지 확인하는 메서드
     * @param obj
     * @return {boolean}
     */
    function isString(obj) {
        return toString.call(obj) === '[object String]';
    }

    /**
     * 인자가 불리언 타입인지 확인하는 메서드
     * @param {*} obj
     * @return {boolean}
     */
    function isBoolean(obj) {
        return toString.call(obj) === '[object Boolean]';
    }

    /**
     * 인자가 HTML Node 인지 검사한다. (Text Node 도 포함)
     * @param {HTMLElement} html
     * @return {Boolean} HTMLElement 인지 여부
     */
    function isHTMLNode(html) {
        if (typeof(HTMLElement) === 'object') {
            return (html && (html instanceof HTMLElement || !!html.nodeType));
        }
        return !!(html && html.nodeType);
    }
    /**
     * 인자가 HTML Tag 인지 검사한다. (Text Node 제외)
     * @param {HTMLElement} html
     * @return {Boolean} HTMLElement 인지 여부
     */
    function isHTMLTag(html) {
        if (typeof(HTMLElement) === 'object') {
            return (html && (html instanceof HTMLElement));
        }
        return !!(html && html.nodeType && html.nodeType === 1);
    }
    /**
     * null, undefined 여부와 순회 가능한 객체의 순회가능 갯수가 0인지 체크한다.
     * @param {*} obj 평가할 대상
     * @return {boolean}
     */
    function isEmpty(obj) {
        var key,
            hasKey = false;

        if (!isExisty(obj)) {
            return true;
        }

        if (isArray(obj) || isArguments(obj)) {
            return obj.length === 0;
        }

        if (isObject(obj) && !isFunction(obj)) {
            ne.util.forEachOwnProperties(obj, function() {
                hasKey = true;
                return false;
            });

            return !hasKey;
        }

        return true;

    }

    /**
     * isEmpty 메서드와 반대로 동작한다.
     * @param {*} obj 평가할 대상
     * @return {boolean}
     */
    function isNotEmpty(obj) {
        return !isEmpty(obj);
    }


    ne.util.isExisty = isExisty;
    ne.util.isUndefined = isUndefined;
    ne.util.isNull = isNull;
    ne.util.isTruthy = isTruthy;
    ne.util.isFalsy = isFalsy;
    ne.util.isArguments = isArguments;
    ne.util.isArray = Array.isArray || isArray;
    ne.util.isObject = isObject;
    ne.util.isFunction = isFunction;
    ne.util.isNumber = isNumber;
    ne.util.isString = isString;
    ne.util.isBoolean = isBoolean;
    ne.util.isHTMLNode = isHTMLNode;
    ne.util.isHTMLTag = isHTMLTag;
    ne.util.isEmpty = isEmpty;
    ne.util.isNotEmpty = isNotEmpty;

})(window.ne);

/**********
 * window.js
 **********/

/**
 * @fileoverview 팝업 윈도우 관리 모듈
 * @author FE개발팀
 * @dependency browser.js, type.js, object.js, collection.js, func.js, window.js
 */

(function(ne) {
    'use strict';
    if (!ne) {
        ne = window.ne = {};
    }
    if (!ne.util) {
        ne.util = window.ne.util = {};
    }

    var popup_id = 0;

    /**
     * 팝업 컨트롤 클래스
     * @constructor
     * @exports Popup
     * @class
     */
    function Popup() {

        /**
         * 팝업창 캐시용 객체 프로퍼티
         * @type {object}
         */
        this.openedPopup = {};

        /**
         * IE7 에서 부모창과 함께 팝업이 닫힐 지 여부를 가리는 closeWithParent프로퍼티를 Window객체에 추가하면
         * 오류가 발생하는 문제가 있어서, 이를 저장하기 위한 별개의 프로퍼티를 만듦.
         * @type {object}
         */
        this.closeWithParentPopup = {};

        /**
         * IE11 팝업 POST 데이터 브릿지
         * @type {string}
         */
        this.postDataBridgeUrl = '';
    }

    /**********
     * public methods
     **********/

    /**
     * 현재 윈도우가 관리하는 팝업 창 리스트를 반환합니다.
     * @method getPopupList
     * @param {String} [key] key에 해당하는 팝업을 반환한다
     * @returns {Object} popup window list object
     */
    Popup.prototype.getPopupList = function(key) {
        var target;
        if (ne.util.isExisty(key)) {
            target = this.openedPopup[key];
        } else {
            target = this.openedPopup;
        }
        return target;
    };

    /**
     * 팝업창을 여는 메서드
     *
     * IE11에서 POST를 사용해 팝업에 값을 전달할 땐 꼭 postDataBridgeUrl을 설정해야 한다
     *
     * 주의: 다른 도메인을 팝업으로 띄울 경우 보안 문제로 팝업 컨트롤 기능을 사용할 수 없다.
     *
     * @param {String} url 팝업 URL
     * @param {object} options
     *     @param {String} [options.popupName]
     *     팝업창의 key를 설정할 수 있습니다.
     *     이 key를 지정하면 같은 key로 팝업을 열려 할 때 이미 열려있는 경우에는 포커스를 주고, 없는 경우 같은 key로 팝업을 엽니다.
     *
     *     @param {String} [options.popupOptionStr=""]
     *     팝업 윈도우의 기능을 설정할 수 있습니다. window.open() 메서드의 세 번째 인자를 그대로 전달하면 됩니다.
     *     이 기능의 적용에는 브라우저마다 차이가 있습니다. http://www.w3schools.com/jsref/met_win_open.asp 를 참고하시기 바랍니다.
     *
     *     @param {Boolean} [options.closeWithParent=true]
     *     팝업 윈도우를 연 윈도우가 닫힐 때 같이 닫힐 지 여부를 설정할 수 있습니다.
     *
     *     @param {Boolean} [options.useReload=false]
     *     이미 열린 팝업 윈도우를 다시 열 때 새로고침 할 것인지를 설정할 수 있습니다. post 데이터를 전송하는 경우 일부 브라우저에서는 다시 전송 여
     *     부를 묻는 메시지가 출력될 수 있습니다.
     *
     *     @param {string} [options.postDataBridgeUrl='']
     *     IE11 에서 POST로 팝업에 데이터를 전송할 때 팝업이 아닌 새 탭으로 열리는 버그를 우회하기 위한 페이지의 url을 입력합니다.
     *     참고: http://wiki.nhnent.com/pages/viewpage.action?pageId=240562844
     *
     *     @param {String} [options.method=get]
     *     팝업 윈도우에 폼 데이터 자동 전송 기능 이용 시, 데이터 전달 방식을 지정할 수 있습니다.
     *
     *     @param {object} [options.param=null]
     *     팝업 윈도우에 폼 데이터 자동 전송 기능 이용 시, 전달할 데이터를 객체로 넘겨주시면 됩니다.
     */
    Popup.prototype.openPopup = function(url, options) {
        options = ne.util.extend({
            popupName: 'popup_' + popup_id + '_' + (+new Date()),
            popupOptionStr: '', // 팝업 옵션
            useReload: true, // 팝업이 열린 상태에서 다시 열려고 할 때 새로고침 하는지 여부
            closeWithParent: true, // 부모창 닫힐때 팝업 닫기 여부
            method: 'get',
            param: {}
        }, options || {});

        options.method = options.method.toUpperCase();

        this.postDataBridgeUrl = options.postDataBridgeUrl || this.postDataBridgeUrl;

        var popup,
            formElement,
            useIEPostBridge = options.method === 'POST' && options.param &&
                ne.util.browser.msie && ne.util.browser.version === 11;

        if (!ne.util.isExisty(url)) {
            throw new Error('Popup#open() 팝업 URL이 입력되지 않았습니다');
        }

        popup_id += 1;

        // 폼 전송 기능 이용 시 팝업 열기 전 폼을 생성하고 팝업이 열림과 동시에 폼을 전송한 후 폼을 제거한다.
        if (options.param) {
            if (options.method === 'GET') {
                url = url + (/\?/.test(url) ? '&' : '?') + this._parameterize(options.param);
            } else if (options.method === 'POST') {
                if (!useIEPostBridge) {
                    formElement = this.createForm(url, options.param, options.method, options.popupName);
                    url = 'about:blank';
                }
            }
        }

        popup = this.openedPopup[options.popupName];

        if (!ne.util.isExisty(popup)) {
            this.openedPopup[options.popupName] = popup = this._open(useIEPostBridge, options.param,
                url, options.popupName, options.popupOptionStr);

        } else {
            if (popup.closed) {
                this.openedPopup[options.popupName] = popup = this._open(useIEPostBridge, options.param,
                    url, options.popupName, options.popupOptionStr);

            } else {
                if (options.useReload) {
                    popup.location.replace(url);
                }
                popup.focus();
            }
        }

        this.closeWithParentPopup[options.popupName] = options.closeWithParent;

        if (!popup || popup.closed || ne.util.isUndefined(popup.closed)) {
            alert('브라우저에 팝업을 막는 기능이 활성화 상태이기 때문에 서비스 이용에 문제가 있을 수 있습니다. 해당 기능을 비활성화 해 주세요');
        }

        if (options.param && options.method === 'POST' && !useIEPostBridge) {
            if (popup) {
                formElement.submit();
            }
            if (formElement.parentNode) {
                formElement.parentNode.removeChild(formElement);
            }
        }

        window.onunload = ne.util.bind(this.closeAllPopup, this);
    };

    /**
     * 팝업 윈도우를 닫습니다.
     * @param {Boolean} [skipBeforeUnload]
     * @param {Window} [popup] 닫을 윈도우 객체. 생략하면 현재 윈도우를 닫습니다
     */
    Popup.prototype.close = function(skipBeforeUnload, popup) {
        skipBeforeUnload = ne.util.isExisty(skipBeforeUnload) ? skipBeforeUnload : false;

        var target = popup || window;

        if (skipBeforeUnload) {
            window.onunload = null;
        }

        if (!target.closed) {
            target.opener = window.location.href;
            target.close();
        }
    };

    /**
     * 이 창에서 열린 모든 팝업을 닫습니다.
     * @param {Boolean} closeWithParent true 면 openPopup 메서드 호출 시 부모창과 함께 닫기로 설정된 팝업들만 닫습니다.
     */
    Popup.prototype.closeAllPopup = function(closeWithParent) {
        var hasArg = ne.util.isExisty(closeWithParent);

        ne.util.forEachOwnProperties(this.openedPopup, function(popup, key) {
            if ((hasArg && this.closeWithParentPopup[key]) || !hasArg) {
                this.close(false, popup);
            }
        }, this);
    };

    /**
     * 해당 팝업 윈도우를 활성화 시킨다.
     * @param {String} popupName 활성화 시킬 팝업 윈도우 이름
     */
    Popup.prototype.focus = function(popupName) {
        this.getPopupList(popupName).focus();
    };

    /**
     * 브라우저의 query string을 파싱해 객체 형태로 반환
     * @return {object}
     * @private
     */
    Popup.prototype.parseQuery = function() {
        var search,
            pair,
            param = {};

        search = window.location.search.substr(1);
        ne.util.forEachArray(search.split('&'), function(part) {
            pair = part.split('=');
            param[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        });

        return param;
    };

    /**
     * 주어진 인자로 숨겨진 폼을 생성하여 문서에 추가하고 반환
     * @param {string} action 폼 전송 URL
     * @param {object} [data] 폼 전송 시 보내질 데이터
     * @param {string} [method]
     * @param {string} [target]
     * @param {HTMLElement} [container]
     * @returns {HTMLElement}
     */
    Popup.prototype.createForm = function(action, data, method, target, container) {
        var form = document.createElement('form'),
            input;

        container = container || document.body;

        form.method = method || 'POST';
        form.action = action || '';
        form.target = target || '';
        form.style.display = 'none';

        ne.util.forEachOwnProperties(data, function(value, key) {
            input = document.createElement('input');
            input.name = key;
            input.type = 'hidden';
            input.value = value;
            form.appendChild(input);
        });

        container.appendChild(form);

        return form;
    };

    /**********
     * private methods
     **********/

    /**
     * 객체를 쿼리스트링 형태로 변환
     * @param {object} object
     * @returns {string}
     * @private
     */
    Popup.prototype._parameterize = function(object) {
        var query = [];

        ne.util.forEachOwnProperties(object, function(value, key) {
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        });

        return query.join('&');
    };

    /**
     * 실제 팝업을 여는 메서드
     * @param {Boolean} useIEPostBridge IE11에서 팝업에 포스트 데이터를 전달할 때 우회 기능 사용 여부
     * @param {object} param 팝업에 전달할 데이터
     * @param {String} url 팝업 URL
     * @param {String} popupName 팝업 이름
     * @param {String} optionStr 팝업 기능 설정용 value ex) 'width=640,height=320,scrollbars=yes'
     * @returns {Window}
     * @private
     */
    Popup.prototype._open = function(useIEPostBridge, param, url, popupName, optionStr) {
        var popup;

        if (useIEPostBridge) {
            url = this.postDataBridgeUrl + '?storageKey=' + encodeURIComponent(popupName) +
                '&redirectUrl=' + encodeURIComponent(url);
            if (!window.localStorage) {
                alert('IE11브라우저의 문제로 인해 이 기능은 브라우저의 LocalStorage 기능을 활성화 하셔야 이용하실 수 있습니다');
            } else {
                localStorage.removeItem(popupName);
                localStorage.setItem(popupName, JSON.stringify(param));

                popup = window.open(url, popupName, optionStr);
            }
        } else {
            popup = window.open(url, popupName, optionStr);
        }

        return popup;
    };

    ne.util.popup = new Popup();

})(window.ne);

/**
 * @fileoverview 유저의 키입력 시간 정보를 캡쳐하는 모듈
 * @author FE개발팀 이제인 <jein.yi@nhnent.com>
 * @dependency jquery-1.8.3.min.js, common.js
 */

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
 *      container: 'vkeyboard', // 컨테이너 엘리먼트 아이디
 *      keyType: 'number', // 키보드 타입
 *      functions: { // 기능키 위치
 *          shuffle: 0,
 *          language: 2,
 *          caps: 3,
 *          symbol: 4,
 *          remove: 5,
 *          clear: 9,
 *          space: 10,
 *          close: 11,
 *          done: 20
 *      },
 *      keys: ["9", "3", "5", "1", "", "7", "0", "2", "4", "6", "8", ""], // 사용키값
 *      template: { // 기능키 템플릿
 *          key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
 *          blank: '<li class="subcon"><span class="btn_key"></span></li>',
 *          shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button" value="shuffle">재배열</button></span></li>',
 *          remove: '<li class="subcon last"><span class="btn btn_del"><button type="button" value="remove"><span class="sp">삭제</span></button></span></li>'
 *      },
 *      callback: { // 기능키 동작 콜백
 *          key: function() { //run },          // 값이 입력될때마다 호출되는 콜백 (고정위치 키 제외)
 *          remove: function() { //run },
 *          getKeys: function() { //run }        // 재배열시 키목록을 새로 요청하는 콜백
 *      }
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

        inputValue = $(targetButton).val();
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
        // 기존 입력값 초기화
        this._keySequences.length = 0;
        this._initContainer();
        this._getRawKeys();
    },

    /**
     * 한/영 자판을 변환한다.
     */
    language: function() {
        this._initContainer();
        this._isEnglish = !this._isEnglish;
        this._currentKeyType = this._isEnglish ? 'english' : 'korean'
        this._getRawKeys();
    },

    /**
     * 대소문자 변환을 한다.
     */
    caps: function() {
        this._initContainer();
        this._isCapsLock = !this._isCapsLock;
        this._getRawKeys(true);
    },

    /**
     * 특수키/숫자키 변환을 한다.
     */
    symbol: function() {
        this._initContainer();
        this._isSymbol = !this._isSymbol;
        this._currentKeyType = this._isSymbol ? 'symbol' : 'number';
        this._getRawKeys();
    },

    /**
     * 마지막으로 입력된 값을 삭제한다.
     */
    remove: function() {
    },

    /**
     * 전체 입력값을 초기화한다.
     */
    clear: function() {
    },

    /**
     * 공백문자를 입력한다.
     */
    space: function() {
    },

    /**
     * 가상키보드를 연다.
     */
    open: function() {
        this.shuffle();
        this._$container.show();
    },

    /**
     * 가상키보드를 닫는다.
     */
    close: function() {
        this.clear();
        this._$container.hide();
    },

    /**
     * 완료버튼을 처리한다.
     */
    done: function() {
        this.close();
    }
});
})();