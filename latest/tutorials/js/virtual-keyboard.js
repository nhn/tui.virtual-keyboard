(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
tui.util.defineNamespace('tui.component.VirtualKeyboard', require('./src/js/virtualKeyboard.js'));

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
 * var vkeyboard = new tui.component.VirtualKeyboard({
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
 *      },
 *      isClickOnly: false
 * });
 * @constructor VirtualKeyboard
 */
var VirtualKeyboard = tui.util.defineClass(/** @lends VirtualKeyboard.prototype */{
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

        this._attachEvent(options.isClickOnly);
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
        this._template = tui.util.extend(this._template, options.template);
        this._callback = options.callback || {};
        this._documentFragment = document.createDocumentFragment();
    },

    /**
     * Binds event
     * @param {boolean} isClickOnly A option to decide to ignore touchevent
     * @private
     */
    _attachEvent: function(isClickOnly) {
        var isSupportTouch = !isClickOnly && ('createTouch' in document) || ('ontouchstart' in document);
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
        if(!tui.util.isExisty(targetButton)) {
            return false;
        }

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
        tui.util.forEach(sortedKeys, function(value, index) {
            if(tui.util.isExisty(value)) {
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
        tui.util.forEach(this._rawKeys, function(value, index) {
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
        if(!tui.util.isExisty(originalArray)) {
            return false;
        }
        if(!tui.util.isArray(originalArray)) {
            originalArray = [originalArray];
        }
        if(!tui.util.isExisty(copyArray) || !tui.util.isArray(copyArray)) {
            copyArray = [];
        }

        tui.util.forEach(originalArray, function(value, index) {
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

        sortedKeys = tui.util.keys(this._fixedKeys) || [];
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
        tui.util.forEach(this._fixedKeys, function(value, key) {
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
        tui.util.forEach(this._identifiedRawKeys, function(value, index) {
            if(tui.util.isExisty(this._keyMap[value])) {
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
        if(tui.util.isExisty(this._fixedKeys[key])) {
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
            tui.util.forEach(this._identifiedRawKeys, function(value) {
                this._documentFragment.appendChild(this._keyMap[value].element);
            }, this);
        } else {
            this._$container = $('#' + containerId);
            if(!tui.util.isHTMLTag(this._$container[0])) {
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
        tui.util.forEach(this._keySequences, function(value) {
            keyElement = this._keyMap[value].element;
            if(!tui.util.isHTMLTag(keyElement)) {
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

        if(tui.util.isExisty(key)) {
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
        if(!buttonElement.val() && tui.util.isExisty(key)) {
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
        if(tui.util.isExisty(this._callback, callbackKey) && tui.util.isFunction(this._callback[callbackKey])) {
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
        if(tui.util.isExisty(this._callback, 'getKeys') && tui.util.isFunction(this._callback.getKeys)) {
            if(isCaseToggle) {
                // Not shuffled, only get other case array.
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock, true);
            } else {
                // Get new keys information array
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock);
            }
        }
        if(tui.util.isArray(rawKeys)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ0dWkudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ3R1aS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkJywgcmVxdWlyZSgnLi9zcmMvanMvdmlydHVhbEtleWJvYXJkLmpzJykpO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoZSBtb2R1bGUgdGhhdCBjYXB0dXJlIGtleXMgdHlwZWQgZnJvbSB1c2VyLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBkZXYgdGVhbS4gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqIEBkZXBlbmRlbmN5IGpxdWVyeS0xLjguMy5taW4uanMsIGNvbW1vbi5qc1xuICovXG5cbi8qKlxuICogQSB2aXJ0dWFsIGtleWJvYXJkIGNvbXBvbmVudCBpcyBjYXB0dXJpbmcga3llcyB0aGF0IGlzIHR5cGVkIGZyb20gdXNlci5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQ3JlYXRlIFZpcnR1YWxLZXlib2FyZCBpbnN0YW5jZSB3aXRoIGFycmF5IG9mIGtleWJvYXJkXG4gKiB2YXIgdmtleWJvYXJkID0gbmV3IHR1aS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkKHtcbiAqICAgICAgY29udGFpbmVyOiAndmtleWJvYXJkJywgLy8gY29udGFpbmVyIGVsZW1lbnQgaWRcbiAqICAgICAga2V5VHlwZTogJ251bWJlcicsIC8vIGtleWJvYXJkIHR5cGVcbiAqICAgICAgZnVuY3Rpb25zOiB7IC8vIGZ1bmN0aW9uIGtleSBsb2NhdGlvblxuICogICAgICAgICAgc2h1ZmZsZTogMCxcbiAqICAgICAgICAgIGxhbmd1YWdlOiAyLFxuICogICAgICAgICAgY2FwczogMyxcbiAqICAgICAgICAgIHN5bWJvbDogNCxcbiAqICAgICAgICAgIHJlbW92ZTogNSxcbiAqICAgICAgICAgIGNsZWFyOiA5LFxuICogICAgICAgICAgc3BhY2U6IDEwLFxuICogICAgICAgICAgY2xvc2U6IDExLFxuICogICAgICAgICAgZG9uZTogMjBcbiAqICAgICAgfSxcbiAqICAgICAga2V5czogW1wiOVwiLCBcIjNcIiwgXCI1XCIsIFwiMVwiLCBcIlwiLCBcIjdcIiwgXCIwXCIsIFwiMlwiLCBcIjRcIiwgXCI2XCIsIFwiOFwiLCBcIlwiXSwgLy8gYWxsIGtleXMgYnV0IGZ1bmN0aW9uIGtleXMuXG4gKiAgICAgIHRlbXBsYXRlOiB7IC8vIGh0bWwgdGVtcGxhdGV0IGZvciBrZXkgZWxlbWVudHNcbiAqICAgICAgICAgIGtleTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuX2tleVwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiPntLRVl9PC9idXR0b24+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIGJsYW5rOiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIHNodWZmbGU6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0biBidG5fcmVsb2FkXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJzaHVmZmxlXCI+7J6s67Cw7Je0PC9idXR0b24+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIHJlbW92ZTogJzxsaSBjbGFzcz1cInN1YmNvbiBsYXN0XCI+PHNwYW4gY2xhc3M9XCJidG4gYnRuX2RlbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwicmVtb3ZlXCI+PHNwYW4gY2xhc3M9XCJzcFwiPuyCreygnDwvc3Bhbj48L2J1dHRvbj48L3NwYW4+PC9saT4nXG4gKiAgICAgIH0sXG4gKiAgICAgIGNhbGxiYWNrOiB7IC8vIGNhbGxiYWNrIGZvciBmdW5jdGlvbiBvciBub3JtYWwga2V5c1xuICogICAgICAgICAga2V5OiBmdW5jdGlvbigpIHsgLy9ydW4gfSwgICAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHVzZXIgdHlwZSBvciB0b3VjaCBrZXkgKGJ1dCBmdW5jdGlvbiBrZXkpXG4gKiAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LFxuICogICAgICAgICAgZ2V0S2V5czogZnVuY3Rpb24oKSB7IC8vcnVuIH0gICAgICAgIC8vIEEgY2FsbGJhY2sgdGhhdCBjYWxsZWQgIHJlYXJyYW5nZSBrZXlzXG4gKiAgICAgIH0sXG4gKiAgICAgIGlzQ2xpY2tPbmx5OiBmYWxzZVxuICogfSk7XG4gKiBAY29uc3RydWN0b3IgVmlydHVhbEtleWJvYXJkXG4gKi9cbnZhciBWaXJ0dWFsS2V5Ym9hcmQgPSB0dWkudXRpbC5kZWZpbmVDbGFzcygvKiogQGxlbmRzIFZpcnR1YWxLZXlib2FyZC5wcm90b3R5cGUgKi97XG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBodG1sIHRlbXBsYXRlIGZvciBrZXlzXG4gICAgICogQHJlYWRvbmx5XG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF90ZW1wbGF0ZToge1xuICAgICAgICBrZXk6ICc8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJ7S0VZfVwiPntLRVl9PC9idXR0b24+PC9saT4nLFxuICAgICAgICBibGFuazogJzxsaT48L2xpPidcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZGF0YSBmb3IgZml4ZWQga2V5cyhmdW5jdGlvbiBrZXlzKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZml4ZWRLZXlzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgZm9yIHVuZml4ZWQga2V5cycgb3JkZXIuXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Jhd0tleXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgYmxhbmsga2V5cycgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZmllZFJhd0tleXM6IFtdLFxuXG4gICAgLyoqKiBcbiAgICAgKiBUaGUgbWFwIGRhdGEgZm9yIHZlcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2tleU1hcDoge30sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IG9mIGFsbCBvZiBrZXlzKGZpeGVkLCB1bmZpeGVkKScgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5U2VxdWVuY2VzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEEgbWFwIGZvciBjYWxsYmFjayBzdXBwb3NlZCB0byBydW4gZm9yIGtleXNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NhbGxiYWNrOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEtleSB0eXBlIG9mIGN1cnJlbnQga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2N1cnJlbnRLZXlUeXBlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBlbmdsaXNoIGtleWJvYXJkIG9yIG5vdFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2lzRW5nbGlzaDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHN5bWJvbCBsZXR0ZXIga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNTeW1ib2w6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogd2hldGhlciBjYXBzIGxvY2sgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNDYXBzTG9jazogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnRGcmFnbWVudCBpbnByb210dSBwb29sIGZvciBzYXZpbmcga2V5IGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kb2N1bWVudEZyYWdtZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGFsaXplIFxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgdG8gaW5pdGlhbGl6ZSBjb21wb25lbnRcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2luaXRWYXJpYWJsZXMob3B0aW9ucyB8fCB7fSk7XG5cbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleVNlcXVlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUtleU1hcCgpO1xuICAgICAgICB0aGlzLl9pbml0S2V5Ym9hcmQob3B0aW9ucy5jb250YWluZXIpO1xuXG4gICAgICAgIHRoaXMuX2F0dGFjaEV2ZW50KG9wdGlvbnMuaXNDbGlja09ubHkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHByaXZhdGUgZmlsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAgT3B0aW9ucyB0byBpbml0aWFsaXplIGtleWJvYXJkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdFZhcmlhYmxlczogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLl9jdXJyZW50S2V5VHlwZSA9IG9wdGlvbnMua2V5VHlwZSB8fCAnZW5nbGlzaCc7XG4gICAgICAgIHRoaXMuX2ZpeGVkS2V5cyA9IG9wdGlvbnMuZnVuY3Rpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLl9yYXdLZXlzID0gdGhpcy5fY29weUFycmF5KG9wdGlvbnMua2V5cyk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlID0gdHVpLnV0aWwuZXh0ZW5kKHRoaXMuX3RlbXBsYXRlLCBvcHRpb25zLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2sgPSBvcHRpb25zLmNhbGxiYWNrIHx8IHt9O1xuICAgICAgICB0aGlzLl9kb2N1bWVudEZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kcyBldmVudFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDbGlja09ubHkgQSBvcHRpb24gdG8gZGVjaWRlIHRvIGlnbm9yZSB0b3VjaGV2ZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXR0YWNoRXZlbnQ6IGZ1bmN0aW9uKGlzQ2xpY2tPbmx5KSB7XG4gICAgICAgIHZhciBpc1N1cHBvcnRUb3VjaCA9ICFpc0NsaWNrT25seSAmJiAoJ2NyZWF0ZVRvdWNoJyBpbiBkb2N1bWVudCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50KTtcbiAgICAgICAgdmFyIGV2ZW50VHlwZSA9IGlzU3VwcG9ydFRvdWNoID8gJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJztcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5vbihldmVudFR5cGUsICQucHJveHkodGhpcy5fcHJlc3NLZXlIYW5kbGVyLCB0aGlzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXIgZm9yIGNsaWNrIG9yIHRvdWNoIGJ1dHRvbnNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgQSBldmVudCBvYmplY3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9wcmVzc0tleUhhbmRsZXI6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciB0YXJnZXRCdXR0b24gPSB0aGlzLl9nZXRUYXJnZXRCdXR0b24oZXZlbnQudGFyZ2V0KSxcbiAgICAgICAgICAgIGlucHV0VmFsdWUsXG4gICAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAgIGtleUdyb3VwO1xuICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkodGFyZ2V0QnV0dG9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5wdXRWYWx1ZSA9ICQodGFyZ2V0QnV0dG9uKS50ZXh0KCk7XG4gICAgICAgIGluZGV4ID0gdGhpcy5fa2V5TWFwW2lucHV0VmFsdWVdLnJhd0luZGV4O1xuICAgICAgICBrZXlHcm91cCA9IHRoaXMuX2dldEtleUdyb3VwKGlucHV0VmFsdWUpO1xuXG4gICAgICAgIGlmKGtleUdyb3VwID09PSAna2V5Jykge1xuICAgICAgICAgICAgdGhpcy5fZXhjdXRlQ2FsbGJhY2soa2V5R3JvdXAsIGluZGV4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXNbaW5wdXRWYWx1ZV0oKTtcbiAgICAgICAgICAgIHRoaXMuX2V4Y3V0ZUNhbGxiYWNrKGlucHV0VmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY2xpY2tlZC90b3VjaGVkIGVsZW1lbnRzIG9mIGtleXNcbiAgICAgKiBAcGFyYW0ge2VsZW1lbnR9IHRhcmdldEVsZW1lbnQgQSBjbGlja2VkL3RvdWNoZWQgaHRtbCBlbGVtZW50XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGFyZ2V0QnV0dG9uOiBmdW5jdGlvbih0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgIGlmKHRhcmdldEVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09PSAnQlVUVE9OJykge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldEVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0YXJnZXRFbGVtZW50KS5wYXJlbnQoJ2J1dHRvbicpWzBdO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBrZXlzIGFycmF5IGZvciB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXJyYW5nZUtleVNlcXVlbmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNvcnRlZEtleXM7XG5cbiAgICAgICAgLy8gU29ydCBmaXhlZCBrZXlzIGJ5IGluZGV4XG4gICAgICAgIHNvcnRlZEtleXMgPSB0aGlzLl9zb3J0Rml4ZWRLZXlzKCk7XG5cbiAgICAgICAgLy8gQ29weSByZWNpZXZlZCBrZXkgYXJyYXlcbiAgICAgICAgdGhpcy5faWRlbnRpZnlSYXdLZXlzKCk7XG4gICAgICAgIHRoaXMuX2NvcHlBcnJheSh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgdGhpcy5fa2V5U2VxdWVuY2VzKTtcblxuICAgICAgICAvLyBJbnNlcnQgZml4ZWQga2V5IFxuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHNvcnRlZEtleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLnNwbGljZSh0aGlzLl9maXhlZEtleXNbdmFsdWVdLCAwLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbmplY3Qga2V5IHZhbHVlIHRvIGZpbmQgYmxhbmsga2V5XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZnlSYXdLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJsYW5rQ291bnQgPSAwO1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX3Jhd0tleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodGhpcy5fZ2V0S2V5R3JvdXAodmFsdWUpID09PSAnYmxhbmsnKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAnYmxhbmsnICsgYmxhbmtDb3VudDtcbiAgICAgICAgICAgICAgICBibGFua0NvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9pZGVudGlmaWVkUmF3S2V5c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYXJyYXkgKG5vdCBkZWVwIGNvcHkpXG4gICAgICogQHBhcmFtIHthcnJheX0gb3JpZ2luYWxBcnJheSBPcmlnaW5hbCBhcnJheVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGNvcHlBcnJheSBOZXcgYXJyYXlcbiAgICAgKiBAcmV0dXJucyB7Kn0gXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY29weUFycmF5OiBmdW5jdGlvbihvcmlnaW5hbEFycmF5LCBjb3B5QXJyYXkpIHtcbiAgICAgICAgaWYoIXR1aS51dGlsLmlzRXhpc3R5KG9yaWdpbmFsQXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYoIXR1aS51dGlsLmlzQXJyYXkob3JpZ2luYWxBcnJheSkpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQXJyYXkgPSBbb3JpZ2luYWxBcnJheV07XG4gICAgICAgIH1cbiAgICAgICAgaWYoIXR1aS51dGlsLmlzRXhpc3R5KGNvcHlBcnJheSkgfHwgIXR1aS51dGlsLmlzQXJyYXkoY29weUFycmF5KSkge1xuICAgICAgICAgICAgY29weUFycmF5ID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKG9yaWdpbmFsQXJyYXksIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29weUFycmF5W2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gY29weUFycmF5O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IGZpeGVkIGtleXMuXG4gICAgICogQHJldHVybnMge0FycmF5fSBGaXhlZCBrZXlzJyBhcnJheSB0aGF0IGlzIHNvcnRlZCBieSBpbmRleFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3NvcnRGaXhlZEtleXMgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNvcnRlZEtleXM7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHNvcnRlZEtleXMgPSB0dWkudXRpbC5rZXlzKHRoaXMuX2ZpeGVkS2V5cykgfHwgW107XG4gICAgICAgIHNvcnRlZEtleXMuc29ydCgkLnByb3h5KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9maXhlZEtleXNbYV0gLSB0aGlzLl9maXhlZEtleXNbYl07XG4gICAgICAgIH0sIHRoaXMpKTtcblxuICAgICAgICByZXR1cm4gc29ydGVkS2V5cztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIG1hcCBkYXRhIGJ5IGtleSBpbmZvcm1hdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUtleU1hcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3JlZmluZUZpeGVkS2V5cygpO1xuICAgICAgICB0aGlzLl9yZWZpbmVGbG9hdGluZ0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVkZWZpbmUgZml4ZWQga2V5cyBtYXBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVGaXhlZEtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2ZpeGVkS2V5cywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgdGhpcy5fa2V5TWFwW2tleV0gPSB7XG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgcmF3SW5kZXg6IG51bGwsXG4gICAgICAgICAgICAgICAgcG9zaXRpb25JbmRleDogdmFsdWUsXG4gICAgICAgICAgICAgICAga2V5R3JvdXA6IHRoaXMuX2dldEtleUdyb3VwKGtleSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWRlZmluZSB1bmZpeGVkIGtleXMgbWFwXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lRmxvYXRpbmdLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9rZXlNYXBbdmFsdWVdKSkge1xuICAgICAgICAgICAgICAgIC8vIEV4aXN0IGNhc2UsIG9ubHkgY2hhbmdlIHBvc2l0aW9uIGluZGV4XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXS5wb3NpdGlvbkluZGV4ID0gdGhpcy5fZ2V0UG9zaXRpb25JbmRleCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgbWFwIGRhdGFcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBrZXk6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICByYXdJbmRleDogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uSW5kZXg6IHRoaXMuX2dldFBvc2l0aW9uSW5kZXgodmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICBrZXlHcm91cDogdGhpcy5fZ2V0S2V5R3JvdXAodGhpcy5fcmF3S2V5c1tpbmRleF0pXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiBrZXkgdHlwZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHZhbHVlIFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEga2V5IHR5cGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRLZXlHcm91cDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlHcm91cDtcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fZml4ZWRLZXlzW2tleV0pKSB7XG4gICAgICAgICAgICBrZXlHcm91cCA9ICdmdW5jdGlvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZihrZXkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAga2V5R3JvdXAgPSAnYmxhbmsnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlHcm91cCA9ICdrZXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlHcm91cDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogZXR1cm4gaW5kZXgga2V5cyBpbiB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB2YWx1ZSBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBBIGtleSBpbmRleFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFBvc2l0aW9uSW5kZXg6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgICBsZW5ndGggPSB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoO1xuXG4gICAgICAgIGZvcig7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYoa2V5ID09PSB0aGlzLl9rZXlTZXF1ZW5jZXNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFZpcnR1YWxLZXlib2FyZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVySWQgQSBjb250YWluZXIgaWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0S2V5Ym9hcmQ6IGZ1bmN0aW9uKGNvbnRhaW5lcklkKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoY29udGFpbmVySWQpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvbnRhaW5lclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJJZCBBIGNvbnRhaW5lciBpZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXRDb250YWluZXI6IGZ1bmN0aW9uKGNvbnRhaW5lcklkKSB7XG4gICAgICAgIGlmKHRoaXMuXyRjb250YWluZXIpIHtcbiAgICAgICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5faWRlbnRpZmllZFJhd0tleXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZG9jdW1lbnRGcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gJCgnIycgKyBjb250YWluZXJJZCk7XG4gICAgICAgICAgICBpZighdHVpLnV0aWwuaXNIVE1MVGFnKHRoaXMuXyRjb250YWluZXJbMF0pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lciA9IHRoaXMuX2NyZWF0ZUNvbnRhaW5lcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBWaXJ0dWFsS2V5Ym9hcmQgY29udGFpbmVyXG4gICAgICogQHJldHVybnMge2VsZW1lbnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlQ29udGFpbmVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lcklkID0gJ3ZrLScgKyB0aGlzLl9nZXRUaW1lKCksXG4gICAgICAgICAgICBjb250YWluZXIgPSAkKCc8dWwgaWQ9JyArIGNvbnRhaW5lcklkICsgJz4nKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hcHBlbmQoY29udGFpbmVyKTtcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGN1cnJlbnQgdGltZVxuICAgICAqIEByZXR1cm5zIHttaWxsaXNlY29uZH0gRGF0ZSB0aW1lIGJ5IG1pbGxpc2Vjb25kXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGltZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aW1lU3RhbXA7XG4gICAgICAgIGlmKERhdGUubm93KSB7XG4gICAgICAgICAgICB0aW1lU3RhbXAgPSBEYXRlLm5vdygpIHx8IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aW1lU3RhbXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFycmFuZ2Uga2V5cyBpbiB2aXJ0dWFsIGtleWJvYXJkLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FycmFuZ2VLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGtleUVsZW1lbnQ7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fa2V5U2VxdWVuY2VzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAga2V5RWxlbWVudCA9IHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudDtcbiAgICAgICAgICAgIGlmKCF0dWkudXRpbC5pc0hUTUxUYWcoa2V5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQgPSBrZXlFbGVtZW50ID0gdGhpcy5fY3JlYXRlS2V5RWxlbWVudCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyLmFwcGVuZChrZXlFbGVtZW50KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0ZW1wbGF0ZSBieSBrZXkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleUdyb3VwIEEga2V5IHR5cGUgdG8gY3JlYXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB0byBjcmVhdGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRlbXBsYXRlOiBmdW5jdGlvbihrZXlHcm91cCwga2V5KSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZTtcblxuICAgICAgICBpZihrZXlHcm91cCA9PT0gJ2JsYW5rJykge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZS5ibGFuaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVba2V5XSB8fCB0aGlzLl90ZW1wbGF0ZS5rZXk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eShrZXkpKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRlbXBsYXRlLnJlcGxhY2UoL3tLRVl9L2csIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUga2V5IGJ1dHRvbiBhbmQgcmV0dXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXlzIHRvIGNyZWF0ZVxuICAgICAqIEByZXR1cm5zIHtlbGVtZW50fSBBIGtleSBidXR0b24gZWxlbWVudFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZUtleUVsZW1lbnQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5R3JvdXAgPSB0aGlzLl9rZXlNYXBba2V5XS5rZXlHcm91cCxcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fZ2V0VGVtcGxhdGUoa2V5R3JvdXAsIGtleSksXG4gICAgICAgICAgICBrZXlFbGVtZW50ID0gJCh0ZW1wbGF0ZSk7XG4gICAgICAgIHZhciBidXR0b25FbGVtZW50ID0ga2V5RWxlbWVudC5maW5kKCdidXR0b24nKTtcbiAgICAgICAgaWYoIWJ1dHRvbkVsZW1lbnQudmFsKCkgJiYgdHVpLnV0aWwuaXNFeGlzdHkoa2V5KSkge1xuICAgICAgICAgICAgYnV0dG9uRWxlbWVudC52YWwoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5RWxlbWVudFswXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZSB0aGUga2V5c1xuICAgICAqIEBwYXJhbSB7YXJyYXl9IHJhd0tleXMgQSBrZXlzIHRoYXQgaXMgc2h1ZmZsZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZUFycmFuZ2VLZXlzOiBmdW5jdGlvbihyYXdLZXlzKSB7XG4gICAgICAgIC8vIEluaXRhaWxpemUgZXhpc3Qga2V5c1xuICAgICAgICB0aGlzLl9yYXdLZXlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHRoaXMuX2NvcHlBcnJheShyYXdLZXlzLCB0aGlzLl9yYXdLZXlzKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleVNlcXVlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW4gY3VzdG9tIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrS2V5IFRoZSBrZXlzIGZvciBjYWxsYmFhayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByYXdJbmRleCBUaGUgdHlwZWQgaW5kZXggbnVtYmVyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2V4Y3V0ZUNhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFja0tleSwgcmF3SW5kZXgpIHtcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fY2FsbGJhY2ssIGNhbGxiYWNrS2V5KSAmJiB0dWkudXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XShyYXdJbmRleCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGtleWJvYXJkIGFycmF5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0Nhc2VUb2dnbGUgV2hldGhlciBjaGFuZ2UgY2FzZSBvciBub3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRSYXdLZXlzOiBmdW5jdGlvbihpc0Nhc2VUb2dnbGUpIHtcbiAgICAgICAgdmFyIHJhd0tleXM7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2NhbGxiYWNrLCAnZ2V0S2V5cycpICYmIHR1aS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2suZ2V0S2V5cykpIHtcbiAgICAgICAgICAgIGlmKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICAgICAgICAgIC8vIE5vdCBzaHVmZmxlZCwgb25seSBnZXQgb3RoZXIgY2FzZSBhcnJheS5cbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jaywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdldCBuZXcga2V5cyBpbmZvcm1hdGlvbiBhcnJheVxuICAgICAgICAgICAgICAgIHJhd0tleXMgPSB0aGlzLl9jYWxsYmFjay5nZXRLZXlzKHRoaXMuX2N1cnJlbnRLZXlUeXBlLCB0aGlzLl9pc0NhcHNMb2NrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZih0dWkudXRpbC5pc0FycmF5KHJhd0tleXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yZUFycmFuZ2VLZXlzKHJhd0tleXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUga2V5cy5cbiAgICAgKi9cbiAgICBzaHVmZmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVzZXQgZXhpc3QgdmFsdWVzXG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIEVuZy9Lb3IuXG4gICAgICovXG4gICAgbGFuZ3VhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzRW5nbGlzaCA9ICF0aGlzLl9pc0VuZ2xpc2g7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gdGhpcy5faXNFbmdsaXNoID8gJ2VuZ2xpc2gnIDogJ2tvcmVhbic7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIHVwcGVyL2xvd2VyIGNhc2UuXG4gICAgICovXG4gICAgY2FwczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNDYXBzTG9jayA9ICF0aGlzLl9pc0NhcHNMb2NrO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2Ugc3ltYm9sL251bWJlciBrZXlzXG4gICAgICovXG4gICAgc3ltYm9sOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc1N5bWJvbCA9ICF0aGlzLl9pc1N5bWJvbDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc1N5bWJvbCA/ICdzeW1ib2wnIDogJ251bWJlcic7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBsYXN0IHR5cGVkL3RvdWNoZWQgdmFsdWVcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgdHlwZWQga2V5cy5cbiAgICAgKi9cbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc2VydCBibGFua1xuICAgICAqL1xuICAgIHNwYWNlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbiB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICovXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2h1ZmZsZSgpO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgdmlydHVhbCBrZXlib2FyZFxuICAgICAqL1xuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgdmllcnR1YWwga2V5Ym9hcmQgd2l0aCBjb21wbGF0ZSBidXR0b24uXG4gICAgICovXG4gICAgZG9uZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsS2V5Ym9hcmQ7XG4iXX0=
