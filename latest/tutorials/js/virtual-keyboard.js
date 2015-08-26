(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ne.util.defineNamespace('ne.component.VirtualKeyboard', require('./src/js/virtualKeyboard.js'));

},{"./src/js/virtualKeyboard.js":2}],2:[function(require,module,exports){
/**
 * @fileoverview The module that capture keys typed from user.
 * @author NHN Ent. FE dev team. <dl_javascript@nhnent.com>
 * @dependency jquery-1.8.3.min.js, common.js
 */

/**
 * A virtual keyboard component is capturing kyes that is typed from user.
 * @example
 *
 * // Create VirtualKeyboard instance with array of keyboard
 * var vkeyboard = new ne.component.VirtualKeyboard({
 *      container: 'vkeyboard', // container element id
 *      keyType: 'number', // keyboard type
 *      functions: { // function key location
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
 *      keys: ["9", "3", "5", "1", "", "7", "0", "2", "4", "6", "8", ""], // all keys but function keys.
 *      template: { // html templatet for key elements
 *          key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
 *          blank: '<li class="subcon"><span class="btn_key"></span></li>',
 *          shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button" value="shuffle">재배열</button></span></li>',
 *          remove: '<li class="subcon last"><span class="btn btn_del"><button type="button" value="remove"><span class="sp">삭제</span></button></span></li>'
 *      },
 *      callback: { // callback for function or normal keys
 *          key: function() { //run },          // A callback that is called when user type or touch key (but function key)
 *          remove: function() { //run },
 *          getKeys: function() { //run }        // A callback that called  rearrange keys
 *      }
 * });
 * @constructor ne.component.VirtualKeyboard
 */
var VirtualKeyboard = ne.util.defineClass(/** @lends ne.component.VirtualKeyboard.prototype */{
    /**
     * Default html template for keys
     * @readonly
     * @type {object}
     * @private
     */
    _template: {
        key: '<li><button type="button" value="{KEY}">{KEY}</button></li>',
        blank: '<li></li>'
    },

    /**
     * A map data for fixed keys(function keys)
     * @type {object}
     * @private
     */
    _fixedKeys: {},

    /**
     * A array for unfixed keys' order.
     * @type {array}
     * @private
     */
    _rawKeys: [],

    /**
     * A array for blank keys' order
     * @type {array}
     * @private
     */
    _identifiedRawKeys: [],

    /*** 
     * The map data for vertual keyboard
     * @type {object}
     * @private
     */
    _keyMap: {},

    /**
     * A array of all of keys(fixed, unfixed)' order
     * @type {array}
     * @private
     */
    _keySequences: [],

    /**
     * A map for callback supposed to run for keys
     * @type {object}
     * @private
     */
    _callback: {},

    /**
     * Key type of current keyboard
     * @type {string}
     * @private
     */
    _currentKeyType: null,

    /**
     * Whether english keyboard or not
     * @type {boolean}
     * @private
     */
    _isEnglish: false,

    /**
     * Whether symbol letter keyboard or not
     * @type {boolean}
     * @private
     */
    _isSymbol: false,

    /**
     * whether caps lock or not
     * @type {boolean}
     * @private
     */
    _isCapsLock: false,

    /**
     * The documentFragment inpromtu pool for saving key element
     * @type {element}
     * @private
     */
    _documentFragment: null,

    /**
     * Initalize 
	 * @param {object} [options] Options to initialize component
     */
    init: function(options) {
        this._initVariables(options || {});

        this._arrangeKeySequence();
        this._refineKeyMap();
        this._initKeyboard(options.container);

        this._attachEvent();
    },

    /**
     * Initialize private files
     * @param {object} options  Options to initialize keyboard
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
     * Binds event
     * @private
     */
    _attachEvent: function() {
        // touch event 지원여부 확
        var isSupportTouch = ('createTouch' in document) || ('ontouchstart' in document);
        var eventType = isSupportTouch ? 'touchstart' : 'click';
        this._$container.on(eventType, $.proxy(this._pressKeyHandler, this));
    },

    /**
     * Handler for click or touch buttons
     * @param {object} event A event object
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

        //inputValue = $(targetButton).val();
        inputValue = $(targetButton).text();
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
     * Returns clicked/touched elements of keys
     * @param {element} targetElement A clicked/touched html element
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
     * Create keys array for virtual keyboard
     * @private
     */
    _arrangeKeySequence: function() {
        var sortedKeys;

        // Sort fixed keys by index
        sortedKeys = this._sortFixedKeys();

        // Copy recieved key array
        this._identifyRawKeys();
        this._copyArray(this._identifiedRawKeys, this._keySequences);

        // Insert fixed key 
        ne.util.forEach(sortedKeys, function(value, index) {
            if(ne.util.isExisty(value)) {
                this._keySequences.splice(this._fixedKeys[value], 0, value);
            }
        }, this);
    },

    /**
     * Inject key value to find blank key
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
     * Copy array (not deep copy)
     * @param {array} originalArray Original array
     * @param {array} copyArray New array
     * @returns {*} 
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
     * Sort fixed keys.
     * @returns {Array} Fixed keys' array that is sorted by index
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
     * Create map data by key information
     * @private
     */
    _refineKeyMap: function() {
        this._refineFixedKeys();
        this._refineFloatingKeys();
    },

    /**
     * Redefine fixed keys map
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
     * Redefine unfixed keys map
     * @private
     */
    _refineFloatingKeys: function() {
        ne.util.forEach(this._identifiedRawKeys, function(value, index) {
            if(ne.util.isExisty(this._keyMap[value])) {
                // Exist case, only change position index
                this._keyMap[value].positionIndex = this._getPositionIndex(value);
            } else {
                // Create new map data
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
     * Return key type.
     * @param {string} key A key value 
     * @returns {string} A key type
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
     * eturn index keys in virtual keyboard
     * @param {string} key A key value 
     * @returns {number} A key index
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
     * Initialize VirtualKeyboard.
     * @param {string} containerId A container id
     * @private
     */
    _initKeyboard: function(containerId) {
        this._initContainer(containerId);
        this._arrangeKeys();
    },

    /**
     * Initialize container
     * @param {string} containerId A container id
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
     * Create VirtualKeyboard container
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
     * Return current time
     * @returns {millisecond} Date time by millisecond
     * @private
     */
    _getTime: function() {
        var timeStamp;
        if(Date.now) {
            timeStamp = Date.now() || new Date().getTime();
        }
        return timeStamp;
    },

    /**
     * Arrange keys in virtual keyboard.
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
     * Return template by key.
     * @param {string} keyGroup A key type to create
     * @param {string} key A key to create
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
     * Create key button and return.
     * @param {string} key A keys to create
     * @returns {element} A key button element
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
     * Shuffle the keys
     * @param {array} rawKeys A keys that is shuffled
     * @private
     */
    _reArrangeKeys: function(rawKeys) {
        // Initailize exist keys
        this._rawKeys.length = 0;
        this._keySequences.length = 0;

        this._copyArray(rawKeys, this._rawKeys);
        this._arrangeKeySequence();
        this._refineFloatingKeys();
        this._arrangeKeys();
    },

    /**
     * Run custom callback
     * @param {string} callbackKey The keys for callbaak function
     * @param {number} rawIndex The typed index numberd
     * @private
     */
    _excuteCallback: function(callbackKey, rawIndex) {
        if(ne.util.isExisty(this._callback, callbackKey) && ne.util.isFunction(this._callback[callbackKey])) {
            this._callback[callbackKey](rawIndex);
        }
    },

    /**
     * Get keyboard array
     * @param {boolean} isCaseToggle Whether change case or not
     * @private
     */
    _getRawKeys: function(isCaseToggle) {
        var rawKeys;
        if(ne.util.isExisty(this._callback, 'getKeys') && ne.util.isFunction(this._callback.getKeys)) {
            if(isCaseToggle) {
                // Not shuffled, only get other case array.
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock, true);
            } else {
                // Get new keys information array
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock);
            }
        }
        if(ne.util.isArray(rawKeys)) {
            this._reArrangeKeys(rawKeys);
        }
    },

    /**
     * Shuffle keys.
     */
    shuffle: function() {
        // Reset exist values
        this._keySequences.length = 0;
        this._initContainer();
        this._getRawKeys();
    },

    /**
     * Toggle Eng/Kor.
     */
    language: function() {
        this._initContainer();
        this._isEnglish = !this._isEnglish;
        this._currentKeyType = this._isEnglish ? 'english' : 'korean';
        this._getRawKeys();
    },

    /**
     * Change upper/lower case.
     */
    caps: function() {
        this._initContainer();
        this._isCapsLock = !this._isCapsLock;
        this._getRawKeys(true);
    },

    /**
     * Change symbol/number keys
     */
    symbol: function() {
        this._initContainer();
        this._isSymbol = !this._isSymbol;
        this._currentKeyType = this._isSymbol ? 'symbol' : 'number';
        this._getRawKeys();
    },

    /**
     * Remove the last typed/touched value
     */
    remove: function() {
    },

    /**
     * Reset all typed keys.
     */
    clear: function() {
    },

    /**
     * Insert blank
     */
    space: function() {
    },

    /**
     * Open virtual keyboard
     */
    open: function() {
        this.shuffle();
        this._$container.show();
    },

    /**
     * Close virtual keyboard
     */
    close: function() {
        this.clear();
        this._$container.hide();
    },

    /**
     * Close viertual keyboard with complate button.
     */
    done: function() {
        this.close();
    }
});

module.exports = VirtualKeyboard;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibmUudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ25lLmNvbXBvbmVudC5WaXJ0dWFsS2V5Ym9hcmQnLCByZXF1aXJlKCcuL3NyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMnKSk7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgVGhlIG1vZHVsZSB0aGF0IGNhcHR1cmUga2V5cyB0eXBlZCBmcm9tIHVzZXIuXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIGRldiB0ZWFtLiA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICogQGRlcGVuZGVuY3kganF1ZXJ5LTEuOC4zLm1pbi5qcywgY29tbW9uLmpzXG4gKi9cblxuLyoqXG4gKiBBIHZpcnR1YWwga2V5Ym9hcmQgY29tcG9uZW50IGlzIGNhcHR1cmluZyBreWVzIHRoYXQgaXMgdHlwZWQgZnJvbSB1c2VyLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGluc3RhbmNlIHdpdGggYXJyYXkgb2Yga2V5Ym9hcmRcbiAqIHZhciB2a2V5Ym9hcmQgPSBuZXcgbmUuY29tcG9uZW50LlZpcnR1YWxLZXlib2FyZCh7XG4gKiAgICAgIGNvbnRhaW5lcjogJ3ZrZXlib2FyZCcsIC8vIGNvbnRhaW5lciBlbGVtZW50IGlkXG4gKiAgICAgIGtleVR5cGU6ICdudW1iZXInLCAvLyBrZXlib2FyZCB0eXBlXG4gKiAgICAgIGZ1bmN0aW9uczogeyAvLyBmdW5jdGlvbiBrZXkgbG9jYXRpb25cbiAqICAgICAgICAgIHNodWZmbGU6IDAsXG4gKiAgICAgICAgICBsYW5ndWFnZTogMixcbiAqICAgICAgICAgIGNhcHM6IDMsXG4gKiAgICAgICAgICBzeW1ib2w6IDQsXG4gKiAgICAgICAgICByZW1vdmU6IDUsXG4gKiAgICAgICAgICBjbGVhcjogOSxcbiAqICAgICAgICAgIHNwYWNlOiAxMCxcbiAqICAgICAgICAgIGNsb3NlOiAxMSxcbiAqICAgICAgICAgIGRvbmU6IDIwXG4gKiAgICAgIH0sXG4gKiAgICAgIGtleXM6IFtcIjlcIiwgXCIzXCIsIFwiNVwiLCBcIjFcIiwgXCJcIiwgXCI3XCIsIFwiMFwiLCBcIjJcIiwgXCI0XCIsIFwiNlwiLCBcIjhcIiwgXCJcIl0sIC8vIGFsbCBrZXlzIGJ1dCBmdW5jdGlvbiBrZXlzLlxuICogICAgICB0ZW1wbGF0ZTogeyAvLyBodG1sIHRlbXBsYXRldCBmb3Iga2V5IGVsZW1lbnRzXG4gKiAgICAgICAgICBrZXk6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0bl9rZXlcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIj57S0VZfTwvYnV0dG9uPjwvc3Bhbj48L2xpPicsXG4gKiAgICAgICAgICBibGFuazogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuX2tleVwiPjwvc3Bhbj48L2xpPicsXG4gKiAgICAgICAgICBzaHVmZmxlOiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG4gYnRuX3JlbG9hZFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwic2h1ZmZsZVwiPuyerOuwsOyXtDwvYnV0dG9uPjwvc3Bhbj48L2xpPicsXG4gKiAgICAgICAgICByZW1vdmU6ICc8bGkgY2xhc3M9XCJzdWJjb24gbGFzdFwiPjxzcGFuIGNsYXNzPVwiYnRuIGJ0bl9kZWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cInJlbW92ZVwiPjxzcGFuIGNsYXNzPVwic3BcIj7sgq3soJw8L3NwYW4+PC9idXR0b24+PC9zcGFuPjwvbGk+J1xuICogICAgICB9LFxuICogICAgICBjYWxsYmFjazogeyAvLyBjYWxsYmFjayBmb3IgZnVuY3Rpb24gb3Igbm9ybWFsIGtleXNcbiAqICAgICAgICAgIGtleTogZnVuY3Rpb24oKSB7IC8vcnVuIH0sICAgICAgICAgIC8vIEEgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB1c2VyIHR5cGUgb3IgdG91Y2gga2V5IChidXQgZnVuY3Rpb24ga2V5KVxuICogICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbigpIHsgLy9ydW4gfSxcbiAqICAgICAgICAgIGdldEtleXM6IGZ1bmN0aW9uKCkgeyAvL3J1biB9ICAgICAgICAvLyBBIGNhbGxiYWNrIHRoYXQgY2FsbGVkICByZWFycmFuZ2Uga2V5c1xuICogICAgICB9XG4gKiB9KTtcbiAqIEBjb25zdHJ1Y3RvciBuZS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkXG4gKi9cbnZhciBWaXJ0dWFsS2V5Ym9hcmQgPSBuZS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgbmUuY29tcG9uZW50LlZpcnR1YWxLZXlib2FyZC5wcm90b3R5cGUgKi97XG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBodG1sIHRlbXBsYXRlIGZvciBrZXlzXG4gICAgICogQHJlYWRvbmx5XG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF90ZW1wbGF0ZToge1xuICAgICAgICBrZXk6ICc8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJ7S0VZfVwiPntLRVl9PC9idXR0b24+PC9saT4nLFxuICAgICAgICBibGFuazogJzxsaT48L2xpPidcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZGF0YSBmb3IgZml4ZWQga2V5cyhmdW5jdGlvbiBrZXlzKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZml4ZWRLZXlzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgZm9yIHVuZml4ZWQga2V5cycgb3JkZXIuXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Jhd0tleXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgYmxhbmsga2V5cycgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZmllZFJhd0tleXM6IFtdLFxuXG4gICAgLyoqKiBcbiAgICAgKiBUaGUgbWFwIGRhdGEgZm9yIHZlcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2tleU1hcDoge30sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IG9mIGFsbCBvZiBrZXlzKGZpeGVkLCB1bmZpeGVkKScgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5U2VxdWVuY2VzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEEgbWFwIGZvciBjYWxsYmFjayBzdXBwb3NlZCB0byBydW4gZm9yIGtleXNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NhbGxiYWNrOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEtleSB0eXBlIG9mIGN1cnJlbnQga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2N1cnJlbnRLZXlUeXBlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBlbmdsaXNoIGtleWJvYXJkIG9yIG5vdFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2lzRW5nbGlzaDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHN5bWJvbCBsZXR0ZXIga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNTeW1ib2w6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogd2hldGhlciBjYXBzIGxvY2sgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNDYXBzTG9jazogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnRGcmFnbWVudCBpbnByb210dSBwb29sIGZvciBzYXZpbmcga2V5IGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kb2N1bWVudEZyYWdtZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGFsaXplIFxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgdG8gaW5pdGlhbGl6ZSBjb21wb25lbnRcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2luaXRWYXJpYWJsZXMob3B0aW9ucyB8fCB7fSk7XG5cbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleVNlcXVlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUtleU1hcCgpO1xuICAgICAgICB0aGlzLl9pbml0S2V5Ym9hcmQob3B0aW9ucy5jb250YWluZXIpO1xuXG4gICAgICAgIHRoaXMuX2F0dGFjaEV2ZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJpdmF0ZSBmaWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBPcHRpb25zIHRvIGluaXRpYWxpemUga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0VmFyaWFibGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gb3B0aW9ucy5rZXlUeXBlIHx8ICdlbmdsaXNoJztcbiAgICAgICAgdGhpcy5fZml4ZWRLZXlzID0gb3B0aW9ucy5mdW5jdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3Jhd0tleXMgPSB0aGlzLl9jb3B5QXJyYXkob3B0aW9ucy5rZXlzKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGUgPSBuZS51dGlsLmV4dGVuZCh0aGlzLl90ZW1wbGF0ZSwgb3B0aW9ucy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjayB8fCB7fTtcbiAgICAgICAgdGhpcy5fZG9jdW1lbnRGcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZHMgZXZlbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIHRvdWNoIGV2ZW50IOyngOybkOyXrOu2gCDtmZVcbiAgICAgICAgdmFyIGlzU3VwcG9ydFRvdWNoID0gKCdjcmVhdGVUb3VjaCcgaW4gZG9jdW1lbnQpIHx8ICgnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudCk7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBpc1N1cHBvcnRUb3VjaCA/ICd0b3VjaHN0YXJ0JyA6ICdjbGljayc7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIub24oZXZlbnRUeXBlLCAkLnByb3h5KHRoaXMuX3ByZXNzS2V5SGFuZGxlciwgdGhpcykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVyIGZvciBjbGljayBvciB0b3VjaCBidXR0b25zXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IEEgZXZlbnQgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcHJlc3NLZXlIYW5kbGVyOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0QnV0dG9uID0gdGhpcy5fZ2V0VGFyZ2V0QnV0dG9uKGV2ZW50LnRhcmdldCksXG4gICAgICAgICAgICBpbnB1dFZhbHVlLFxuICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICBrZXlHcm91cDtcbiAgICAgICAgaWYoIW5lLnV0aWwuaXNFeGlzdHkodGFyZ2V0QnV0dG9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9pbnB1dFZhbHVlID0gJCh0YXJnZXRCdXR0b24pLnZhbCgpO1xuICAgICAgICBpbnB1dFZhbHVlID0gJCh0YXJnZXRCdXR0b24pLnRleHQoKTtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9rZXlNYXBbaW5wdXRWYWx1ZV0ucmF3SW5kZXg7XG4gICAgICAgIGtleUdyb3VwID0gdGhpcy5fZ2V0S2V5R3JvdXAoaW5wdXRWYWx1ZSk7XG5cbiAgICAgICAgaWYoa2V5R3JvdXAgPT09ICdrZXknKSB7XG4gICAgICAgICAgICB0aGlzLl9leGN1dGVDYWxsYmFjayhrZXlHcm91cCwgaW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpc1tpbnB1dFZhbHVlXSgpO1xuICAgICAgICAgICAgdGhpcy5fZXhjdXRlQ2FsbGJhY2soaW5wdXRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjbGlja2VkL3RvdWNoZWQgZWxlbWVudHMgb2Yga2V5c1xuICAgICAqIEBwYXJhbSB7ZWxlbWVudH0gdGFyZ2V0RWxlbWVudCBBIGNsaWNrZWQvdG91Y2hlZCBodG1sIGVsZW1lbnRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUYXJnZXRCdXR0b246IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgaWYodGFyZ2V0RWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdCVVRUT04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRhcmdldEVsZW1lbnQpLnBhcmVudCgnYnV0dG9uJylbMF07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGtleXMgYXJyYXkgZm9yIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hcnJhbmdlS2V5U2VxdWVuY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc29ydGVkS2V5cztcblxuICAgICAgICAvLyBTb3J0IGZpeGVkIGtleXMgYnkgaW5kZXhcbiAgICAgICAgc29ydGVkS2V5cyA9IHRoaXMuX3NvcnRGaXhlZEtleXMoKTtcblxuICAgICAgICAvLyBDb3B5IHJlY2lldmVkIGtleSBhcnJheVxuICAgICAgICB0aGlzLl9pZGVudGlmeVJhd0tleXMoKTtcbiAgICAgICAgdGhpcy5fY29weUFycmF5KHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCB0aGlzLl9rZXlTZXF1ZW5jZXMpO1xuXG4gICAgICAgIC8vIEluc2VydCBmaXhlZCBrZXkgXG4gICAgICAgIG5lLnV0aWwuZm9yRWFjaChzb3J0ZWRLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKG5lLnV0aWwuaXNFeGlzdHkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLnNwbGljZSh0aGlzLl9maXhlZEtleXNbdmFsdWVdLCAwLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbmplY3Qga2V5IHZhbHVlIHRvIGZpbmQgYmxhbmsga2V5XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZnlSYXdLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJsYW5rQ291bnQgPSAwO1xuICAgICAgICBuZS51dGlsLmZvckVhY2godGhpcy5fcmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0aGlzLl9nZXRLZXlHcm91cCh2YWx1ZSkgPT09ICdibGFuaycpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICdibGFuaycgKyBibGFua0NvdW50O1xuICAgICAgICAgICAgICAgIGJsYW5rQ291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhcnJheSAobm90IGRlZXAgY29weSlcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBvcmlnaW5hbEFycmF5IE9yaWdpbmFsIGFycmF5XG4gICAgICogQHBhcmFtIHthcnJheX0gY29weUFycmF5IE5ldyBhcnJheVxuICAgICAqIEByZXR1cm5zIHsqfSBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jb3B5QXJyYXk6IGZ1bmN0aW9uKG9yaWdpbmFsQXJyYXksIGNvcHlBcnJheSkge1xuICAgICAgICBpZighbmUudXRpbC5pc0V4aXN0eShvcmlnaW5hbEFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmKCFuZS51dGlsLmlzQXJyYXkob3JpZ2luYWxBcnJheSkpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQXJyYXkgPSBbb3JpZ2luYWxBcnJheV07XG4gICAgICAgIH1cbiAgICAgICAgaWYoIW5lLnV0aWwuaXNFeGlzdHkoY29weUFycmF5KSB8fCAhbmUudXRpbC5pc0FycmF5KGNvcHlBcnJheSkpIHtcbiAgICAgICAgICAgIGNvcHlBcnJheSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgbmUudXRpbC5mb3JFYWNoKG9yaWdpbmFsQXJyYXksIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29weUFycmF5W2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gY29weUFycmF5O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IGZpeGVkIGtleXMuXG4gICAgICogQHJldHVybnMge0FycmF5fSBGaXhlZCBrZXlzJyBhcnJheSB0aGF0IGlzIHNvcnRlZCBieSBpbmRleFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3NvcnRGaXhlZEtleXMgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNvcnRlZEtleXM7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHNvcnRlZEtleXMgPSBuZS51dGlsLmtleXModGhpcy5fZml4ZWRLZXlzKSB8fCBbXTtcbiAgICAgICAgc29ydGVkS2V5cy5zb3J0KCQucHJveHkoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZpeGVkS2V5c1thXSAtIHRoaXMuX2ZpeGVkS2V5c1tiXTtcbiAgICAgICAgfSwgdGhpcykpO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRLZXlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgbWFwIGRhdGEgYnkga2V5IGluZm9ybWF0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lS2V5TWFwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fcmVmaW5lRml4ZWRLZXlzKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWRlZmluZSBmaXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZpeGVkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIG5lLnV0aWwuZm9yRWFjaCh0aGlzLl9maXhlZEtleXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIHRoaXMuX2tleU1hcFtrZXldID0ge1xuICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgIHJhd0luZGV4OiBudWxsLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uSW5kZXg6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cChrZXkpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVkZWZpbmUgdW5maXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZsb2F0aW5nS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIG5lLnV0aWwuZm9yRWFjaCh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZihuZS51dGlsLmlzRXhpc3R5KHRoaXMuX2tleU1hcFt2YWx1ZV0pKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhpc3QgY2FzZSwgb25seSBjaGFuZ2UgcG9zaXRpb24gaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLnBvc2l0aW9uSW5kZXggPSB0aGlzLl9nZXRQb3NpdGlvbkluZGV4KHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBtYXAgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHJhd0luZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25JbmRleDogdGhpcy5fZ2V0UG9zaXRpb25JbmRleCh2YWx1ZSksXG4gICAgICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cCh0aGlzLl9yYXdLZXlzW2luZGV4XSlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGtleSB0eXBlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSBrZXkgdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldEtleUdyb3VwOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleUdyb3VwO1xuICAgICAgICBpZihuZS51dGlsLmlzRXhpc3R5KHRoaXMuX2ZpeGVkS2V5c1trZXldKSkge1xuICAgICAgICAgICAga2V5R3JvdXAgPSAnZnVuY3Rpb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoa2V5ID09PSAnJykge1xuICAgICAgICAgICAgICAgIGtleUdyb3VwID0gJ2JsYW5rJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5R3JvdXAgPSAna2V5JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5R3JvdXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGV0dXJuIGluZGV4IGtleXMgaW4gdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge251bWJlcn0gQSBrZXkgaW5kZXhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRQb3NpdGlvbkluZGV4OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aDtcblxuICAgICAgICBmb3IoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKGtleSA9PT0gdGhpcy5fa2V5U2VxdWVuY2VzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBWaXJ0dWFsS2V5Ym9hcmQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIEEgY29udGFpbmVyIGlkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdEtleWJvYXJkOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKGNvbnRhaW5lcklkKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb250YWluZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVySWQgQSBjb250YWluZXIgaWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0Q29udGFpbmVyOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICBpZih0aGlzLl8kY29udGFpbmVyKSB7XG4gICAgICAgICAgICBuZS51dGlsLmZvckVhY2godGhpcy5faWRlbnRpZmllZFJhd0tleXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZG9jdW1lbnRGcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gJCgnIycgKyBjb250YWluZXJJZCk7XG4gICAgICAgICAgICBpZighbmUudXRpbC5pc0hUTUxUYWcodGhpcy5fJGNvbnRhaW5lclswXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gdGhpcy5fY3JlYXRlQ29udGFpbmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFZpcnR1YWxLZXlib2FyZCBjb250YWluZXJcbiAgICAgKiBAcmV0dXJucyB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29udGFpbmVySWQgPSAndmstJyArIHRoaXMuX2dldFRpbWUoKSxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9ICQoJzx1bCBpZD0nICsgY29udGFpbmVySWQgKyAnPicpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFwcGVuZChjb250YWluZXIpO1xuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gY3VycmVudCB0aW1lXG4gICAgICogQHJldHVybnMge21pbGxpc2Vjb25kfSBEYXRlIHRpbWUgYnkgbWlsbGlzZWNvbmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUaW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVTdGFtcDtcbiAgICAgICAgaWYoRGF0ZS5ub3cpIHtcbiAgICAgICAgICAgIHRpbWVTdGFtcCA9IERhdGUubm93KCkgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbWVTdGFtcDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXJyYW5nZSBrZXlzIGluIHZpcnR1YWwga2V5Ym9hcmQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXJyYW5nZUtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIga2V5RWxlbWVudDtcbiAgICAgICAgbmUudXRpbC5mb3JFYWNoKHRoaXMuX2tleVNlcXVlbmNlcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQ7XG4gICAgICAgICAgICBpZighbmUudXRpbC5pc0hUTUxUYWcoa2V5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQgPSBrZXlFbGVtZW50ID0gdGhpcy5fY3JlYXRlS2V5RWxlbWVudCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyLmFwcGVuZChrZXlFbGVtZW50KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0ZW1wbGF0ZSBieSBrZXkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleUdyb3VwIEEga2V5IHR5cGUgdG8gY3JlYXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB0byBjcmVhdGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRlbXBsYXRlOiBmdW5jdGlvbihrZXlHcm91cCwga2V5KSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZTtcblxuICAgICAgICBpZihrZXlHcm91cCA9PT0gJ2JsYW5rJykge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZS5ibGFuaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVba2V5XSB8fCB0aGlzLl90ZW1wbGF0ZS5rZXk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihuZS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgve0tFWX0vZywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBrZXkgYnV0dG9uIGFuZCByZXR1cm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleXMgdG8gY3JlYXRlXG4gICAgICogQHJldHVybnMge2VsZW1lbnR9IEEga2V5IGJ1dHRvbiBlbGVtZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlS2V5RWxlbWVudDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlHcm91cCA9IHRoaXMuX2tleU1hcFtrZXldLmtleUdyb3VwLFxuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl9nZXRUZW1wbGF0ZShrZXlHcm91cCwga2V5KSxcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSAkKHRlbXBsYXRlKTtcbiAgICAgICAgdmFyIGJ1dHRvbkVsZW1lbnQgPSBrZXlFbGVtZW50LmZpbmQoJ2J1dHRvbicpO1xuICAgICAgICBpZighYnV0dG9uRWxlbWVudC52YWwoKSAmJiBuZS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkVsZW1lbnQudmFsKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleUVsZW1lbnRbMF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUgdGhlIGtleXNcbiAgICAgKiBAcGFyYW0ge2FycmF5fSByYXdLZXlzIEEga2V5cyB0aGF0IGlzIHNodWZmbGVkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVBcnJhbmdlS2V5czogZnVuY3Rpb24ocmF3S2V5cykge1xuICAgICAgICAvLyBJbml0YWlsaXplIGV4aXN0IGtleXNcbiAgICAgICAgdGhpcy5fcmF3S2V5cy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcblxuICAgICAgICB0aGlzLl9jb3B5QXJyYXkocmF3S2V5cywgdGhpcy5fcmF3S2V5cyk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlTZXF1ZW5jZSgpO1xuICAgICAgICB0aGlzLl9yZWZpbmVGbG9hdGluZ0tleXMoKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUnVuIGN1c3RvbSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja0tleSBUaGUga2V5cyBmb3IgY2FsbGJhYWsgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcmF3SW5kZXggVGhlIHR5cGVkIGluZGV4IG51bWJlcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9leGN1dGVDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2tLZXksIHJhd0luZGV4KSB7XG4gICAgICAgIGlmKG5lLnV0aWwuaXNFeGlzdHkodGhpcy5fY2FsbGJhY2ssIGNhbGxiYWNrS2V5KSAmJiBuZS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2tbY2FsbGJhY2tLZXldKSkge1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tbY2FsbGJhY2tLZXldKHJhd0luZGV4KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQga2V5Ym9hcmQgYXJyYXlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2FzZVRvZ2dsZSBXaGV0aGVyIGNoYW5nZSBjYXNlIG9yIG5vdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFJhd0tleXM6IGZ1bmN0aW9uKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICB2YXIgcmF3S2V5cztcbiAgICAgICAgaWYobmUudXRpbC5pc0V4aXN0eSh0aGlzLl9jYWxsYmFjaywgJ2dldEtleXMnKSAmJiBuZS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2suZ2V0S2V5cykpIHtcbiAgICAgICAgICAgIGlmKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICAgICAgICAgIC8vIE5vdCBzaHVmZmxlZCwgb25seSBnZXQgb3RoZXIgY2FzZSBhcnJheS5cbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jaywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdldCBuZXcga2V5cyBpbmZvcm1hdGlvbiBhcnJheVxuICAgICAgICAgICAgICAgIHJhd0tleXMgPSB0aGlzLl9jYWxsYmFjay5nZXRLZXlzKHRoaXMuX2N1cnJlbnRLZXlUeXBlLCB0aGlzLl9pc0NhcHNMb2NrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihuZS51dGlsLmlzQXJyYXkocmF3S2V5cykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlQXJyYW5nZUtleXMocmF3S2V5cyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZSBrZXlzLlxuICAgICAqL1xuICAgIHNodWZmbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZXNldCBleGlzdCB2YWx1ZXNcbiAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgRW5nL0tvci5cbiAgICAgKi9cbiAgICBsYW5ndWFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNFbmdsaXNoID0gIXRoaXMuX2lzRW5nbGlzaDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc0VuZ2xpc2ggPyAnZW5nbGlzaCcgOiAna29yZWFuJztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgdXBwZXIvbG93ZXIgY2FzZS5cbiAgICAgKi9cbiAgICBjYXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc0NhcHNMb2NrID0gIXRoaXMuX2lzQ2Fwc0xvY2s7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXModHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSBzeW1ib2wvbnVtYmVyIGtleXNcbiAgICAgKi9cbiAgICBzeW1ib2w6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzU3ltYm9sID0gIXRoaXMuX2lzU3ltYm9sO1xuICAgICAgICB0aGlzLl9jdXJyZW50S2V5VHlwZSA9IHRoaXMuX2lzU3ltYm9sID8gJ3N5bWJvbCcgOiAnbnVtYmVyJztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGxhc3QgdHlwZWQvdG91Y2hlZCB2YWx1ZVxuICAgICAqL1xuICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGFsbCB0eXBlZCBrZXlzLlxuICAgICAqL1xuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IGJsYW5rXG4gICAgICovXG4gICAgc3BhY2U6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBPcGVuIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKi9cbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zaHVmZmxlKCk7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICovXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSB2aWVydHVhbCBrZXlib2FyZCB3aXRoIGNvbXBsYXRlIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxLZXlib2FyZDsiXX0=
