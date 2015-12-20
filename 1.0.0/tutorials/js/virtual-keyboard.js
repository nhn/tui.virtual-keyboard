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
 * @constructor VirtualKeyboard
 * @example
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
            keyElement = $(template),
            buttonElement = keyElement.find('button');

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
     * @api
     * @example
     *  virtualKeyboard.shuffle();
     */
    shuffle: function() {
        // Reset exist values
        this._keySequences.length = 0;
        this._initContainer();
        this._getRawKeys();
    },

    /**
     * Toggle Eng/Kor.
     * @api
     * @example
     *  virtualKeyboard.language();
     */
    language: function() {
        this._initContainer();
        this._isEnglish = !this._isEnglish;
        this._currentKeyType = this._isEnglish ? 'english' : 'korean';
        this._getRawKeys();
    },

    /**
     * Change upper/lower case.
     * @api
     * @example
     *  virtualKeyboard.caps();
     */
    caps: function() {
        this._initContainer();
        this._isCapsLock = !this._isCapsLock;
        this._getRawKeys(true);
    },

    /**
     * Change symbol/number keys
     * @api
     * @example
     *  virtualKeyboard.symbol();
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
     * @api
     * @example
     *  virtualKeyboard.open();
     */
    open: function() {
        this.shuffle();
        this._$container.show();
    },

    /**
     * Close virtual keyboard
     * @api
     * @example
     *  virtualKeyboard.close();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ0dWkudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ3R1aS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkJywgcmVxdWlyZSgnLi9zcmMvanMvdmlydHVhbEtleWJvYXJkLmpzJykpO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoZSBtb2R1bGUgdGhhdCBjYXB0dXJlIGtleXMgdHlwZWQgZnJvbSB1c2VyLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBkZXYgdGVhbS4gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqIEBkZXBlbmRlbmN5IGpxdWVyeS0xLjguMy5taW4uanMsIGNvbW1vbi5qc1xuICovXG5cbi8qKlxuICogQSB2aXJ0dWFsIGtleWJvYXJkIGNvbXBvbmVudCBpcyBjYXB0dXJpbmcga3llcyB0aGF0IGlzIHR5cGVkIGZyb20gdXNlci5cbiAqIEBjb25zdHJ1Y3RvciBWaXJ0dWFsS2V5Ym9hcmRcbiAqIEBleGFtcGxlXG4gKiAvLyBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGluc3RhbmNlIHdpdGggYXJyYXkgb2Yga2V5Ym9hcmRcbiAqIHZhciB2a2V5Ym9hcmQgPSBuZXcgdHVpLmNvbXBvbmVudC5WaXJ0dWFsS2V5Ym9hcmQoe1xuICogICAgICBjb250YWluZXI6ICd2a2V5Ym9hcmQnLCAvLyBjb250YWluZXIgZWxlbWVudCBpZFxuICogICAgICBrZXlUeXBlOiAnbnVtYmVyJywgLy8ga2V5Ym9hcmQgdHlwZVxuICogICAgICBmdW5jdGlvbnM6IHsgLy8gZnVuY3Rpb24ga2V5IGxvY2F0aW9uXG4gKiAgICAgICAgICBzaHVmZmxlOiAwLFxuICogICAgICAgICAgbGFuZ3VhZ2U6IDIsXG4gKiAgICAgICAgICBjYXBzOiAzLFxuICogICAgICAgICAgc3ltYm9sOiA0LFxuICogICAgICAgICAgcmVtb3ZlOiA1LFxuICogICAgICAgICAgY2xlYXI6IDksXG4gKiAgICAgICAgICBzcGFjZTogMTAsXG4gKiAgICAgICAgICBjbG9zZTogMTEsXG4gKiAgICAgICAgICBkb25lOiAyMFxuICogICAgICB9LFxuICogICAgICBrZXlzOiBbXCI5XCIsIFwiM1wiLCBcIjVcIiwgXCIxXCIsIFwiXCIsIFwiN1wiLCBcIjBcIiwgXCIyXCIsIFwiNFwiLCBcIjZcIiwgXCI4XCIsIFwiXCJdLCAvLyBhbGwga2V5cyBidXQgZnVuY3Rpb24ga2V5cy5cbiAqICAgICAgdGVtcGxhdGU6IHsgLy8gaHRtbCB0ZW1wbGF0ZXQgZm9yIGtleSBlbGVtZW50c1xuICogICAgICAgICAga2V5OiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCI+e0tFWX08L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgYmxhbms6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0bl9rZXlcIj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgc2h1ZmZsZTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuIGJ0bl9yZWxvYWRcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cInNodWZmbGVcIj7snqzrsLDsl7Q8L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgcmVtb3ZlOiAnPGxpIGNsYXNzPVwic3ViY29uIGxhc3RcIj48c3BhbiBjbGFzcz1cImJ0biBidG5fZGVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJyZW1vdmVcIj48c3BhbiBjbGFzcz1cInNwXCI+7IKt7KCcPC9zcGFuPjwvYnV0dG9uPjwvc3Bhbj48L2xpPidcbiAqICAgICAgfSxcbiAqICAgICAgY2FsbGJhY2s6IHsgLy8gY2FsbGJhY2sgZm9yIGZ1bmN0aW9uIG9yIG5vcm1hbCBrZXlzXG4gKiAgICAgICAgICBrZXk6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LCAgICAgICAgICAvLyBBIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdXNlciB0eXBlIG9yIHRvdWNoIGtleSAoYnV0IGZ1bmN0aW9uIGtleSlcbiAqICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7IC8vcnVuIH0sXG4gKiAgICAgICAgICBnZXRLZXlzOiBmdW5jdGlvbigpIHsgLy9ydW4gfSAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGNhbGxlZCAgcmVhcnJhbmdlIGtleXNcbiAqICAgICAgfSxcbiAqICAgICAgaXNDbGlja09ubHk6IGZhbHNlXG4gKiB9KTtcbiAqL1xudmFyIFZpcnR1YWxLZXlib2FyZCA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgVmlydHVhbEtleWJvYXJkLnByb3RvdHlwZSAqL3tcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGh0bWwgdGVtcGxhdGUgZm9yIGtleXNcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3RlbXBsYXRlOiB7XG4gICAgICAgIGtleTogJzxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIntLRVl9XCI+e0tFWX08L2J1dHRvbj48L2xpPicsXG4gICAgICAgIGJsYW5rOiAnPGxpPjwvbGk+J1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBIG1hcCBkYXRhIGZvciBmaXhlZCBrZXlzKGZ1bmN0aW9uIGtleXMpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9maXhlZEtleXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgdW5maXhlZCBrZXlzJyBvcmRlci5cbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmF3S2V5czogW10sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IGZvciBibGFuayBrZXlzJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmaWVkUmF3S2V5czogW10sXG5cbiAgICAvKioqIFxuICAgICAqIFRoZSBtYXAgZGF0YSBmb3IgdmVydHVhbCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5TWFwOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgb2YgYWxsIG9mIGtleXMoZml4ZWQsIHVuZml4ZWQpJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9rZXlTZXF1ZW5jZXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZm9yIGNhbGxiYWNrIHN1cHBvc2VkIHRvIHJ1biBmb3Iga2V5c1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY2FsbGJhY2s6IHt9LFxuXG4gICAgLyoqXG4gICAgICogS2V5IHR5cGUgb2YgY3VycmVudCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3VycmVudEtleVR5cGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGVuZ2xpc2gga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNFbmdsaXNoOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgc3ltYm9sIGxldHRlciBrZXlib2FyZCBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc1N5bWJvbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiB3aGV0aGVyIGNhcHMgbG9jayBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc0NhcHNMb2NrOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudEZyYWdtZW50IGlucHJvbXR1IHBvb2wgZm9yIHNhdmluZyBrZXkgZWxlbWVudFxuICAgICAqIEB0eXBlIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RvY3VtZW50RnJhZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0YWxpemUgXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyB0byBpbml0aWFsaXplIGNvbXBvbmVudFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5faW5pdFZhcmlhYmxlcyhvcHRpb25zIHx8IHt9KTtcblxuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5U2VxdWVuY2UoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lS2V5TWFwKCk7XG4gICAgICAgIHRoaXMuX2luaXRLZXlib2FyZChvcHRpb25zLmNvbnRhaW5lcik7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRXZlbnQob3B0aW9ucy5pc0NsaWNrT25seSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJpdmF0ZSBmaWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBPcHRpb25zIHRvIGluaXRpYWxpemUga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0VmFyaWFibGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gb3B0aW9ucy5rZXlUeXBlIHx8ICdlbmdsaXNoJztcbiAgICAgICAgdGhpcy5fZml4ZWRLZXlzID0gb3B0aW9ucy5mdW5jdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3Jhd0tleXMgPSB0aGlzLl9jb3B5QXJyYXkob3B0aW9ucy5rZXlzKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGUgPSB0dWkudXRpbC5leHRlbmQodGhpcy5fdGVtcGxhdGUsIG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2sgfHwge307XG4gICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmRzIGV2ZW50XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NsaWNrT25seSBBIG9wdGlvbiB0byBkZWNpZGUgdG8gaWdub3JlIHRvdWNoZXZlbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oaXNDbGlja09ubHkpIHtcbiAgICAgICAgdmFyIGlzU3VwcG9ydFRvdWNoID0gIWlzQ2xpY2tPbmx5ICYmICgnY3JlYXRlVG91Y2gnIGluIGRvY3VtZW50KSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQpO1xuICAgICAgICB2YXIgZXZlbnRUeXBlID0gaXNTdXBwb3J0VG91Y2ggPyAndG91Y2hzdGFydCcgOiAnY2xpY2snO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLm9uKGV2ZW50VHlwZSwgJC5wcm94eSh0aGlzLl9wcmVzc0tleUhhbmRsZXIsIHRoaXMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlciBmb3IgY2xpY2sgb3IgdG91Y2ggYnV0dG9uc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBBIGV2ZW50IG9iamVjdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3ByZXNzS2V5SGFuZGxlcjogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldEJ1dHRvbiA9IHRoaXMuX2dldFRhcmdldEJ1dHRvbihldmVudC50YXJnZXQpLFxuICAgICAgICAgICAgaW5wdXRWYWx1ZSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAga2V5R3JvdXA7XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eSh0YXJnZXRCdXR0b24pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpbnB1dFZhbHVlID0gJCh0YXJnZXRCdXR0b24pLnRleHQoKTtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9rZXlNYXBbaW5wdXRWYWx1ZV0ucmF3SW5kZXg7XG4gICAgICAgIGtleUdyb3VwID0gdGhpcy5fZ2V0S2V5R3JvdXAoaW5wdXRWYWx1ZSk7XG5cbiAgICAgICAgaWYoa2V5R3JvdXAgPT09ICdrZXknKSB7XG4gICAgICAgICAgICB0aGlzLl9leGN1dGVDYWxsYmFjayhrZXlHcm91cCwgaW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpc1tpbnB1dFZhbHVlXSgpO1xuICAgICAgICAgICAgdGhpcy5fZXhjdXRlQ2FsbGJhY2soaW5wdXRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjbGlja2VkL3RvdWNoZWQgZWxlbWVudHMgb2Yga2V5c1xuICAgICAqIEBwYXJhbSB7ZWxlbWVudH0gdGFyZ2V0RWxlbWVudCBBIGNsaWNrZWQvdG91Y2hlZCBodG1sIGVsZW1lbnRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUYXJnZXRCdXR0b246IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgaWYodGFyZ2V0RWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdCVVRUT04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRhcmdldEVsZW1lbnQpLnBhcmVudCgnYnV0dG9uJylbMF07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGtleXMgYXJyYXkgZm9yIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hcnJhbmdlS2V5U2VxdWVuY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc29ydGVkS2V5cztcblxuICAgICAgICAvLyBTb3J0IGZpeGVkIGtleXMgYnkgaW5kZXhcbiAgICAgICAgc29ydGVkS2V5cyA9IHRoaXMuX3NvcnRGaXhlZEtleXMoKTtcblxuICAgICAgICAvLyBDb3B5IHJlY2lldmVkIGtleSBhcnJheVxuICAgICAgICB0aGlzLl9pZGVudGlmeVJhd0tleXMoKTtcbiAgICAgICAgdGhpcy5fY29weUFycmF5KHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCB0aGlzLl9rZXlTZXF1ZW5jZXMpO1xuXG4gICAgICAgIC8vIEluc2VydCBmaXhlZCBrZXkgXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2goc29ydGVkS2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMuc3BsaWNlKHRoaXMuX2ZpeGVkS2V5c1t2YWx1ZV0sIDAsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluamVjdCBrZXkgdmFsdWUgdG8gZmluZCBibGFuayBrZXlcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmeVJhd0tleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYmxhbmtDb3VudCA9IDA7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fcmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0aGlzLl9nZXRLZXlHcm91cCh2YWx1ZSkgPT09ICdibGFuaycpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICdibGFuaycgKyBibGFua0NvdW50O1xuICAgICAgICAgICAgICAgIGJsYW5rQ291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhcnJheSAobm90IGRlZXAgY29weSlcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBvcmlnaW5hbEFycmF5IE9yaWdpbmFsIGFycmF5XG4gICAgICogQHBhcmFtIHthcnJheX0gY29weUFycmF5IE5ldyBhcnJheVxuICAgICAqIEByZXR1cm5zIHsqfSBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jb3B5QXJyYXk6IGZ1bmN0aW9uKG9yaWdpbmFsQXJyYXksIGNvcHlBcnJheSkge1xuICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkob3JpZ2luYWxBcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZighdHVpLnV0aWwuaXNBcnJheShvcmlnaW5hbEFycmF5KSkge1xuICAgICAgICAgICAgb3JpZ2luYWxBcnJheSA9IFtvcmlnaW5hbEFycmF5XTtcbiAgICAgICAgfVxuICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkoY29weUFycmF5KSB8fCAhdHVpLnV0aWwuaXNBcnJheShjb3B5QXJyYXkpKSB7XG4gICAgICAgICAgICBjb3B5QXJyYXkgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2gob3JpZ2luYWxBcnJheSwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBjb3B5QXJyYXlbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiBjb3B5QXJyYXk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNvcnQgZml4ZWQga2V5cy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZpeGVkIGtleXMnIGFycmF5IHRoYXQgaXMgc29ydGVkIGJ5IGluZGV4XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc29ydEZpeGVkS2V5cyA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc29ydGVkS2V5cztcbiAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgc29ydGVkS2V5cyA9IHR1aS51dGlsLmtleXModGhpcy5fZml4ZWRLZXlzKSB8fCBbXTtcbiAgICAgICAgc29ydGVkS2V5cy5zb3J0KCQucHJveHkoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZpeGVkS2V5c1thXSAtIHRoaXMuX2ZpeGVkS2V5c1tiXTtcbiAgICAgICAgfSwgdGhpcykpO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRLZXlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgbWFwIGRhdGEgYnkga2V5IGluZm9ybWF0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lS2V5TWFwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fcmVmaW5lRml4ZWRLZXlzKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWRlZmluZSBmaXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZpeGVkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fZml4ZWRLZXlzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICB0aGlzLl9rZXlNYXBba2V5XSA9IHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICByYXdJbmRleDogbnVsbCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbkluZGV4OiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBrZXlHcm91cDogdGhpcy5fZ2V0S2V5R3JvdXAoa2V5KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZGVmaW5lIHVuZml4ZWQga2V5cyBtYXBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVGbG9hdGluZ0tleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2tleU1hcFt2YWx1ZV0pKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhpc3QgY2FzZSwgb25seSBjaGFuZ2UgcG9zaXRpb24gaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLnBvc2l0aW9uSW5kZXggPSB0aGlzLl9nZXRQb3NpdGlvbkluZGV4KHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBtYXAgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHJhd0luZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25JbmRleDogdGhpcy5fZ2V0UG9zaXRpb25JbmRleCh2YWx1ZSksXG4gICAgICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cCh0aGlzLl9yYXdLZXlzW2luZGV4XSlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGtleSB0eXBlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSBrZXkgdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldEtleUdyb3VwOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleUdyb3VwO1xuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9maXhlZEtleXNba2V5XSkpIHtcbiAgICAgICAgICAgIGtleUdyb3VwID0gJ2Z1bmN0aW9uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKGtleSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBrZXlHcm91cCA9ICdibGFuayc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUdyb3VwID0gJ2tleSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleUdyb3VwO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBldHVybiBpbmRleCBrZXlzIGluIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHZhbHVlIFxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IEEga2V5IGluZGV4XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0UG9zaXRpb25JbmRleDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGg7XG5cbiAgICAgICAgZm9yKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihrZXkgPT09IHRoaXMuX2tleVNlcXVlbmNlc1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVmlydHVhbEtleWJvYXJkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJJZCBBIGNvbnRhaW5lciBpZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXRLZXlib2FyZDogZnVuY3Rpb24oY29udGFpbmVySWQpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcihjb250YWluZXJJZCk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIEEgY29udGFpbmVyIGlkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdENvbnRhaW5lcjogZnVuY3Rpb24oY29udGFpbmVySWQpIHtcbiAgICAgICAgaWYodGhpcy5fJGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kb2N1bWVudEZyYWdtZW50LmFwcGVuZENoaWxkKHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudCk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIgPSAkKCcjJyArIGNvbnRhaW5lcklkKTtcbiAgICAgICAgICAgIGlmKCF0dWkudXRpbC5pc0hUTUxUYWcodGhpcy5fJGNvbnRhaW5lclswXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gdGhpcy5fY3JlYXRlQ29udGFpbmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFZpcnR1YWxLZXlib2FyZCBjb250YWluZXJcbiAgICAgKiBAcmV0dXJucyB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29udGFpbmVySWQgPSAndmstJyArIHRoaXMuX2dldFRpbWUoKSxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9ICQoJzx1bCBpZD0nICsgY29udGFpbmVySWQgKyAnPicpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFwcGVuZChjb250YWluZXIpO1xuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gY3VycmVudCB0aW1lXG4gICAgICogQHJldHVybnMge21pbGxpc2Vjb25kfSBEYXRlIHRpbWUgYnkgbWlsbGlzZWNvbmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUaW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVTdGFtcDtcbiAgICAgICAgaWYoRGF0ZS5ub3cpIHtcbiAgICAgICAgICAgIHRpbWVTdGFtcCA9IERhdGUubm93KCkgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbWVTdGFtcDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXJyYW5nZSBrZXlzIGluIHZpcnR1YWwga2V5Ym9hcmQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXJyYW5nZUtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIga2V5RWxlbWVudDtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9rZXlTZXF1ZW5jZXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBrZXlFbGVtZW50ID0gdGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50O1xuICAgICAgICAgICAgaWYoIXR1aS51dGlsLmlzSFRNTFRhZyhrZXlFbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudCA9IGtleUVsZW1lbnQgPSB0aGlzLl9jcmVhdGVLZXlFbGVtZW50KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIuYXBwZW5kKGtleUVsZW1lbnQpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRlbXBsYXRlIGJ5IGtleS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5R3JvdXAgQSBrZXkgdHlwZSB0byBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHRvIGNyZWF0ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGVtcGxhdGU6IGZ1bmN0aW9uKGtleUdyb3VwLCBrZXkpIHtcbiAgICAgICAgdmFyIHRlbXBsYXRlO1xuXG4gICAgICAgIGlmKGtleUdyb3VwID09PSAnYmxhbmsnKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlLmJsYW5rO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZVtrZXldIHx8IHRoaXMuX3RlbXBsYXRlLmtleTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgve0tFWX0vZywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBrZXkgYnV0dG9uIGFuZCByZXR1cm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleXMgdG8gY3JlYXRlXG4gICAgICogQHJldHVybnMge2VsZW1lbnR9IEEga2V5IGJ1dHRvbiBlbGVtZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlS2V5RWxlbWVudDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlHcm91cCA9IHRoaXMuX2tleU1hcFtrZXldLmtleUdyb3VwLFxuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl9nZXRUZW1wbGF0ZShrZXlHcm91cCwga2V5KSxcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSAkKHRlbXBsYXRlKSxcbiAgICAgICAgICAgIGJ1dHRvbkVsZW1lbnQgPSBrZXlFbGVtZW50LmZpbmQoJ2J1dHRvbicpO1xuXG4gICAgICAgIGlmKCFidXR0b25FbGVtZW50LnZhbCgpICYmIHR1aS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkVsZW1lbnQudmFsKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleUVsZW1lbnRbMF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUgdGhlIGtleXNcbiAgICAgKiBAcGFyYW0ge2FycmF5fSByYXdLZXlzIEEga2V5cyB0aGF0IGlzIHNodWZmbGVkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVBcnJhbmdlS2V5czogZnVuY3Rpb24ocmF3S2V5cykge1xuICAgICAgICAvLyBJbml0YWlsaXplIGV4aXN0IGtleXNcbiAgICAgICAgdGhpcy5fcmF3S2V5cy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcblxuICAgICAgICB0aGlzLl9jb3B5QXJyYXkocmF3S2V5cywgdGhpcy5fcmF3S2V5cyk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlTZXF1ZW5jZSgpO1xuICAgICAgICB0aGlzLl9yZWZpbmVGbG9hdGluZ0tleXMoKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUnVuIGN1c3RvbSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja0tleSBUaGUga2V5cyBmb3IgY2FsbGJhYWsgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcmF3SW5kZXggVGhlIHR5cGVkIGluZGV4IG51bWJlcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9leGN1dGVDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2tLZXksIHJhd0luZGV4KSB7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2NhbGxiYWNrLCBjYWxsYmFja0tleSkgJiYgdHVpLnV0aWwuaXNGdW5jdGlvbih0aGlzLl9jYWxsYmFja1tjYWxsYmFja0tleV0pKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja1tjYWxsYmFja0tleV0ocmF3SW5kZXgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBrZXlib2FyZCBhcnJheVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDYXNlVG9nZ2xlIFdoZXRoZXIgY2hhbmdlIGNhc2Ugb3Igbm90XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0UmF3S2V5czogZnVuY3Rpb24oaXNDYXNlVG9nZ2xlKSB7XG4gICAgICAgIHZhciByYXdLZXlzO1xuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9jYWxsYmFjaywgJ2dldEtleXMnKSAmJiB0dWkudXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2NhbGxiYWNrLmdldEtleXMpKSB7XG4gICAgICAgICAgICBpZihpc0Nhc2VUb2dnbGUpIHtcbiAgICAgICAgICAgICAgICAvLyBOb3Qgc2h1ZmZsZWQsIG9ubHkgZ2V0IG90aGVyIGNhc2UgYXJyYXkuXG4gICAgICAgICAgICAgICAgcmF3S2V5cyA9IHRoaXMuX2NhbGxiYWNrLmdldEtleXModGhpcy5fY3VycmVudEtleVR5cGUsIHRoaXMuX2lzQ2Fwc0xvY2ssIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV3IGtleXMgaW5mb3JtYXRpb24gYXJyYXlcbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYodHVpLnV0aWwuaXNBcnJheShyYXdLZXlzKSkge1xuICAgICAgICAgICAgdGhpcy5fcmVBcnJhbmdlS2V5cyhyYXdLZXlzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaHVmZmxlIGtleXMuXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5zaHVmZmxlKCk7XG4gICAgICovXG4gICAgc2h1ZmZsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFJlc2V0IGV4aXN0IHZhbHVlc1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBFbmcvS29yLlxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQubGFuZ3VhZ2UoKTtcbiAgICAgKi9cbiAgICBsYW5ndWFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNFbmdsaXNoID0gIXRoaXMuX2lzRW5nbGlzaDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc0VuZ2xpc2ggPyAnZW5nbGlzaCcgOiAna29yZWFuJztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgdXBwZXIvbG93ZXIgY2FzZS5cbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLmNhcHMoKTtcbiAgICAgKi9cbiAgICBjYXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc0NhcHNMb2NrID0gIXRoaXMuX2lzQ2Fwc0xvY2s7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXModHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSBzeW1ib2wvbnVtYmVyIGtleXNcbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLnN5bWJvbCgpO1xuICAgICAqL1xuICAgIHN5bWJvbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNTeW1ib2wgPSAhdGhpcy5faXNTeW1ib2w7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gdGhpcy5faXNTeW1ib2wgPyAnc3ltYm9sJyA6ICdudW1iZXInO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSB0aGUgbGFzdCB0eXBlZC90b3VjaGVkIHZhbHVlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIHR5cGVkIGtleXMuXG4gICAgICovXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnQgYmxhbmtcbiAgICAgKi9cbiAgICBzcGFjZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW4gdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQub3BlbigpO1xuICAgICAqL1xuICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNodWZmbGUoKTtcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb3NlIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLmNsb3NlKCk7XG4gICAgICovXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSB2aWVydHVhbCBrZXlib2FyZCB3aXRoIGNvbXBsYXRlIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxLZXlib2FyZDtcbiJdfQ==
