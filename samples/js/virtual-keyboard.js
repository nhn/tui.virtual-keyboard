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
        var isSupportTouch = !isClickOnly && (('createTouch' in document) || ('ontouchstart' in document));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ0dWkudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ3R1aS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkJywgcmVxdWlyZSgnLi9zcmMvanMvdmlydHVhbEtleWJvYXJkLmpzJykpO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoZSBtb2R1bGUgdGhhdCBjYXB0dXJlIGtleXMgdHlwZWQgZnJvbSB1c2VyLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBkZXYgdGVhbS4gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqIEBkZXBlbmRlbmN5IGpxdWVyeS0xLjguMy5taW4uanMsIGNvbW1vbi5qc1xuICovXG5cbi8qKlxuICogQSB2aXJ0dWFsIGtleWJvYXJkIGNvbXBvbmVudCBpcyBjYXB0dXJpbmcga3llcyB0aGF0IGlzIHR5cGVkIGZyb20gdXNlci5cbiAqIEBjb25zdHJ1Y3RvciBWaXJ0dWFsS2V5Ym9hcmRcbiAqIEBleGFtcGxlXG4gKiAvLyBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGluc3RhbmNlIHdpdGggYXJyYXkgb2Yga2V5Ym9hcmRcbiAqIHZhciB2a2V5Ym9hcmQgPSBuZXcgdHVpLmNvbXBvbmVudC5WaXJ0dWFsS2V5Ym9hcmQoe1xuICogICAgICBjb250YWluZXI6ICd2a2V5Ym9hcmQnLCAvLyBjb250YWluZXIgZWxlbWVudCBpZFxuICogICAgICBrZXlUeXBlOiAnbnVtYmVyJywgLy8ga2V5Ym9hcmQgdHlwZVxuICogICAgICBmdW5jdGlvbnM6IHsgLy8gZnVuY3Rpb24ga2V5IGxvY2F0aW9uXG4gKiAgICAgICAgICBzaHVmZmxlOiAwLFxuICogICAgICAgICAgbGFuZ3VhZ2U6IDIsXG4gKiAgICAgICAgICBjYXBzOiAzLFxuICogICAgICAgICAgc3ltYm9sOiA0LFxuICogICAgICAgICAgcmVtb3ZlOiA1LFxuICogICAgICAgICAgY2xlYXI6IDksXG4gKiAgICAgICAgICBzcGFjZTogMTAsXG4gKiAgICAgICAgICBjbG9zZTogMTEsXG4gKiAgICAgICAgICBkb25lOiAyMFxuICogICAgICB9LFxuICogICAgICBrZXlzOiBbXCI5XCIsIFwiM1wiLCBcIjVcIiwgXCIxXCIsIFwiXCIsIFwiN1wiLCBcIjBcIiwgXCIyXCIsIFwiNFwiLCBcIjZcIiwgXCI4XCIsIFwiXCJdLCAvLyBhbGwga2V5cyBidXQgZnVuY3Rpb24ga2V5cy5cbiAqICAgICAgdGVtcGxhdGU6IHsgLy8gaHRtbCB0ZW1wbGF0ZXQgZm9yIGtleSBlbGVtZW50c1xuICogICAgICAgICAga2V5OiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCI+e0tFWX08L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgYmxhbms6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0bl9rZXlcIj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgc2h1ZmZsZTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuIGJ0bl9yZWxvYWRcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cInNodWZmbGVcIj7snqzrsLDsl7Q8L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgcmVtb3ZlOiAnPGxpIGNsYXNzPVwic3ViY29uIGxhc3RcIj48c3BhbiBjbGFzcz1cImJ0biBidG5fZGVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJyZW1vdmVcIj48c3BhbiBjbGFzcz1cInNwXCI+7IKt7KCcPC9zcGFuPjwvYnV0dG9uPjwvc3Bhbj48L2xpPidcbiAqICAgICAgfSxcbiAqICAgICAgY2FsbGJhY2s6IHsgLy8gY2FsbGJhY2sgZm9yIGZ1bmN0aW9uIG9yIG5vcm1hbCBrZXlzXG4gKiAgICAgICAgICBrZXk6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LCAgICAgICAgICAvLyBBIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdXNlciB0eXBlIG9yIHRvdWNoIGtleSAoYnV0IGZ1bmN0aW9uIGtleSlcbiAqICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7IC8vcnVuIH0sXG4gKiAgICAgICAgICBnZXRLZXlzOiBmdW5jdGlvbigpIHsgLy9ydW4gfSAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGNhbGxlZCAgcmVhcnJhbmdlIGtleXNcbiAqICAgICAgfSxcbiAqICAgICAgaXNDbGlja09ubHk6IGZhbHNlXG4gKiB9KTtcbiAqL1xudmFyIFZpcnR1YWxLZXlib2FyZCA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgVmlydHVhbEtleWJvYXJkLnByb3RvdHlwZSAqL3tcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGh0bWwgdGVtcGxhdGUgZm9yIGtleXNcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3RlbXBsYXRlOiB7XG4gICAgICAgIGtleTogJzxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIntLRVl9XCI+e0tFWX08L2J1dHRvbj48L2xpPicsXG4gICAgICAgIGJsYW5rOiAnPGxpPjwvbGk+J1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBIG1hcCBkYXRhIGZvciBmaXhlZCBrZXlzKGZ1bmN0aW9uIGtleXMpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9maXhlZEtleXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgdW5maXhlZCBrZXlzJyBvcmRlci5cbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmF3S2V5czogW10sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IGZvciBibGFuayBrZXlzJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmaWVkUmF3S2V5czogW10sXG5cbiAgICAvKioqIFxuICAgICAqIFRoZSBtYXAgZGF0YSBmb3IgdmVydHVhbCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5TWFwOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgb2YgYWxsIG9mIGtleXMoZml4ZWQsIHVuZml4ZWQpJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9rZXlTZXF1ZW5jZXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZm9yIGNhbGxiYWNrIHN1cHBvc2VkIHRvIHJ1biBmb3Iga2V5c1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY2FsbGJhY2s6IHt9LFxuXG4gICAgLyoqXG4gICAgICogS2V5IHR5cGUgb2YgY3VycmVudCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3VycmVudEtleVR5cGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGVuZ2xpc2gga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNFbmdsaXNoOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgc3ltYm9sIGxldHRlciBrZXlib2FyZCBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc1N5bWJvbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiB3aGV0aGVyIGNhcHMgbG9jayBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc0NhcHNMb2NrOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudEZyYWdtZW50IGlucHJvbXR1IHBvb2wgZm9yIHNhdmluZyBrZXkgZWxlbWVudFxuICAgICAqIEB0eXBlIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RvY3VtZW50RnJhZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0YWxpemUgXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyB0byBpbml0aWFsaXplIGNvbXBvbmVudFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5faW5pdFZhcmlhYmxlcyhvcHRpb25zIHx8IHt9KTtcblxuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5U2VxdWVuY2UoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lS2V5TWFwKCk7XG4gICAgICAgIHRoaXMuX2luaXRLZXlib2FyZChvcHRpb25zLmNvbnRhaW5lcik7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRXZlbnQob3B0aW9ucy5pc0NsaWNrT25seSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJpdmF0ZSBmaWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBPcHRpb25zIHRvIGluaXRpYWxpemUga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0VmFyaWFibGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gb3B0aW9ucy5rZXlUeXBlIHx8ICdlbmdsaXNoJztcbiAgICAgICAgdGhpcy5fZml4ZWRLZXlzID0gb3B0aW9ucy5mdW5jdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3Jhd0tleXMgPSB0aGlzLl9jb3B5QXJyYXkob3B0aW9ucy5rZXlzKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGUgPSB0dWkudXRpbC5leHRlbmQodGhpcy5fdGVtcGxhdGUsIG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2sgfHwge307XG4gICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmRzIGV2ZW50XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NsaWNrT25seSBBIG9wdGlvbiB0byBkZWNpZGUgdG8gaWdub3JlIHRvdWNoZXZlbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oaXNDbGlja09ubHkpIHtcbiAgICAgICAgdmFyIGlzU3VwcG9ydFRvdWNoID0gIWlzQ2xpY2tPbmx5ICYmICgoJ2NyZWF0ZVRvdWNoJyBpbiBkb2N1bWVudCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50KSk7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBpc1N1cHBvcnRUb3VjaCA/ICd0b3VjaHN0YXJ0JyA6ICdjbGljayc7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIub24oZXZlbnRUeXBlLCAkLnByb3h5KHRoaXMuX3ByZXNzS2V5SGFuZGxlciwgdGhpcykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVyIGZvciBjbGljayBvciB0b3VjaCBidXR0b25zXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IEEgZXZlbnQgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcHJlc3NLZXlIYW5kbGVyOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0QnV0dG9uID0gdGhpcy5fZ2V0VGFyZ2V0QnV0dG9uKGV2ZW50LnRhcmdldCksXG4gICAgICAgICAgICBpbnB1dFZhbHVlLFxuICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICBrZXlHcm91cDtcbiAgICAgICAgaWYoIXR1aS51dGlsLmlzRXhpc3R5KHRhcmdldEJ1dHRvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlucHV0VmFsdWUgPSAkKHRhcmdldEJ1dHRvbikudGV4dCgpO1xuICAgICAgICBpbmRleCA9IHRoaXMuX2tleU1hcFtpbnB1dFZhbHVlXS5yYXdJbmRleDtcbiAgICAgICAga2V5R3JvdXAgPSB0aGlzLl9nZXRLZXlHcm91cChpbnB1dFZhbHVlKTtcblxuICAgICAgICBpZihrZXlHcm91cCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4Y3V0ZUNhbGxiYWNrKGtleUdyb3VwLCBpbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzW2lucHV0VmFsdWVdKCk7XG4gICAgICAgICAgICB0aGlzLl9leGN1dGVDYWxsYmFjayhpbnB1dFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGNsaWNrZWQvdG91Y2hlZCBlbGVtZW50cyBvZiBrZXlzXG4gICAgICogQHBhcmFtIHtlbGVtZW50fSB0YXJnZXRFbGVtZW50IEEgY2xpY2tlZC90b3VjaGVkIGh0bWwgZWxlbWVudFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRhcmdldEJ1dHRvbjogZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuICAgICAgICBpZih0YXJnZXRFbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGFyZ2V0RWxlbWVudCkucGFyZW50KCdidXR0b24nKVswXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUga2V5cyBhcnJheSBmb3IgdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FycmFuZ2VLZXlTZXF1ZW5jZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzb3J0ZWRLZXlzO1xuXG4gICAgICAgIC8vIFNvcnQgZml4ZWQga2V5cyBieSBpbmRleFxuICAgICAgICBzb3J0ZWRLZXlzID0gdGhpcy5fc29ydEZpeGVkS2V5cygpO1xuXG4gICAgICAgIC8vIENvcHkgcmVjaWV2ZWQga2V5IGFycmF5XG4gICAgICAgIHRoaXMuX2lkZW50aWZ5UmF3S2V5cygpO1xuICAgICAgICB0aGlzLl9jb3B5QXJyYXkodGhpcy5faWRlbnRpZmllZFJhd0tleXMsIHRoaXMuX2tleVNlcXVlbmNlcyk7XG5cbiAgICAgICAgLy8gSW5zZXJ0IGZpeGVkIGtleSBcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChzb3J0ZWRLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5zcGxpY2UodGhpcy5fZml4ZWRLZXlzW3ZhbHVlXSwgMCwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5qZWN0IGtleSB2YWx1ZSB0byBmaW5kIGJsYW5rIGtleVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2lkZW50aWZ5UmF3S2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBibGFua0NvdW50ID0gMDtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9yYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX2dldEtleUdyb3VwKHZhbHVlKSA9PT0gJ2JsYW5rJykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJ2JsYW5rJyArIGJsYW5rQ291bnQ7XG4gICAgICAgICAgICAgICAgYmxhbmtDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faWRlbnRpZmllZFJhd0tleXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGFycmF5IChub3QgZGVlcCBjb3B5KVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IG9yaWdpbmFsQXJyYXkgT3JpZ2luYWwgYXJyYXlcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBjb3B5QXJyYXkgTmV3IGFycmF5XG4gICAgICogQHJldHVybnMgeyp9IFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NvcHlBcnJheTogZnVuY3Rpb24ob3JpZ2luYWxBcnJheSwgY29weUFycmF5KSB7XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eShvcmlnaW5hbEFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0FycmF5KG9yaWdpbmFsQXJyYXkpKSB7XG4gICAgICAgICAgICBvcmlnaW5hbEFycmF5ID0gW29yaWdpbmFsQXJyYXldO1xuICAgICAgICB9XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eShjb3B5QXJyYXkpIHx8ICF0dWkudXRpbC5pc0FycmF5KGNvcHlBcnJheSkpIHtcbiAgICAgICAgICAgIGNvcHlBcnJheSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChvcmlnaW5hbEFycmF5LCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGNvcHlBcnJheVtpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgcmV0dXJuIGNvcHlBcnJheTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU29ydCBmaXhlZCBrZXlzLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gRml4ZWQga2V5cycgYXJyYXkgdGhhdCBpcyBzb3J0ZWQgYnkgaW5kZXhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zb3J0Rml4ZWRLZXlzIDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzb3J0ZWRLZXlzO1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcblxuICAgICAgICBzb3J0ZWRLZXlzID0gdHVpLnV0aWwua2V5cyh0aGlzLl9maXhlZEtleXMpIHx8IFtdO1xuICAgICAgICBzb3J0ZWRLZXlzLnNvcnQoJC5wcm94eShmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZml4ZWRLZXlzW2FdIC0gdGhpcy5fZml4ZWRLZXlzW2JdO1xuICAgICAgICB9LCB0aGlzKSk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZEtleXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBtYXAgZGF0YSBieSBrZXkgaW5mb3JtYXRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVLZXlNYXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9yZWZpbmVGaXhlZEtleXMoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lRmxvYXRpbmdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZGVmaW5lIGZpeGVkIGtleXMgbWFwXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lRml4ZWRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9maXhlZEtleXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIHRoaXMuX2tleU1hcFtrZXldID0ge1xuICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgIHJhd0luZGV4OiBudWxsLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uSW5kZXg6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cChrZXkpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVkZWZpbmUgdW5maXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZsb2F0aW5nS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5faWRlbnRpZmllZFJhd0tleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fa2V5TWFwW3ZhbHVlXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGlzdCBjYXNlLCBvbmx5IGNoYW5nZSBwb3NpdGlvbiBpbmRleFxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0ucG9zaXRpb25JbmRleCA9IHRoaXMuX2dldFBvc2l0aW9uSW5kZXgodmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IG1hcCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmF3SW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkluZGV4OiB0aGlzLl9nZXRQb3NpdGlvbkluZGV4KHZhbHVlKSxcbiAgICAgICAgICAgICAgICAgICAga2V5R3JvdXA6IHRoaXMuX2dldEtleUdyb3VwKHRoaXMuX3Jhd0tleXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4ga2V5IHR5cGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB2YWx1ZSBcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIGtleSB0eXBlXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0S2V5R3JvdXA6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5R3JvdXA7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2ZpeGVkS2V5c1trZXldKSkge1xuICAgICAgICAgICAga2V5R3JvdXAgPSAnZnVuY3Rpb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoa2V5ID09PSAnJykge1xuICAgICAgICAgICAgICAgIGtleUdyb3VwID0gJ2JsYW5rJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5R3JvdXAgPSAna2V5JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5R3JvdXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGV0dXJuIGluZGV4IGtleXMgaW4gdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge251bWJlcn0gQSBrZXkgaW5kZXhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRQb3NpdGlvbkluZGV4OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aDtcblxuICAgICAgICBmb3IoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKGtleSA9PT0gdGhpcy5fa2V5U2VxdWVuY2VzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBWaXJ0dWFsS2V5Ym9hcmQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIEEgY29udGFpbmVyIGlkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdEtleWJvYXJkOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKGNvbnRhaW5lcklkKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb250YWluZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVySWQgQSBjb250YWluZXIgaWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0Q29udGFpbmVyOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICBpZih0aGlzLl8kY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50KTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lciA9ICQoJyMnICsgY29udGFpbmVySWQpO1xuICAgICAgICAgICAgaWYoIXR1aS51dGlsLmlzSFRNTFRhZyh0aGlzLl8kY29udGFpbmVyWzBdKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIgPSB0aGlzLl9jcmVhdGVDb250YWluZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGNvbnRhaW5lclxuICAgICAqIEByZXR1cm5zIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZUNvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb250YWluZXJJZCA9ICd2ay0nICsgdGhpcy5fZ2V0VGltZSgpLFxuICAgICAgICAgICAgY29udGFpbmVyID0gJCgnPHVsIGlkPScgKyBjb250YWluZXJJZCArICc+Jyk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuYXBwZW5kKGNvbnRhaW5lcik7XG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiBjdXJyZW50IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7bWlsbGlzZWNvbmR9IERhdGUgdGltZSBieSBtaWxsaXNlY29uZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRpbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGltZVN0YW1wO1xuICAgICAgICBpZihEYXRlLm5vdykge1xuICAgICAgICAgICAgdGltZVN0YW1wID0gRGF0ZS5ub3coKSB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGltZVN0YW1wO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcnJhbmdlIGtleXMgaW4gdmlydHVhbCBrZXlib2FyZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hcnJhbmdlS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBrZXlFbGVtZW50O1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2tleVNlcXVlbmNlcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQ7XG4gICAgICAgICAgICBpZighdHVpLnV0aWwuaXNIVE1MVGFnKGtleUVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50ID0ga2V5RWxlbWVudCA9IHRoaXMuX2NyZWF0ZUtleUVsZW1lbnQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5hcHBlbmQoa2V5RWxlbWVudCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGVtcGxhdGUgYnkga2V5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlHcm91cCBBIGtleSB0eXBlIHRvIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdG8gY3JlYXRlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUZW1wbGF0ZTogZnVuY3Rpb24oa2V5R3JvdXAsIGtleSkge1xuICAgICAgICB2YXIgdGVtcGxhdGU7XG5cbiAgICAgICAgaWYoa2V5R3JvdXAgPT09ICdibGFuaycpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGUuYmxhbms7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlW2tleV0gfHwgdGhpcy5fdGVtcGxhdGUua2V5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkoa2V5KSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKC97S0VZfS9nLCBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGtleSBidXR0b24gYW5kIHJldHVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5cyB0byBjcmVhdGVcbiAgICAgKiBAcmV0dXJucyB7ZWxlbWVudH0gQSBrZXkgYnV0dG9uIGVsZW1lbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVLZXlFbGVtZW50OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleUdyb3VwID0gdGhpcy5fa2V5TWFwW2tleV0ua2V5R3JvdXAsXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX2dldFRlbXBsYXRlKGtleUdyb3VwLCBrZXkpLFxuICAgICAgICAgICAga2V5RWxlbWVudCA9ICQodGVtcGxhdGUpLFxuICAgICAgICAgICAgYnV0dG9uRWxlbWVudCA9IGtleUVsZW1lbnQuZmluZCgnYnV0dG9uJyk7XG5cbiAgICAgICAgaWYoIWJ1dHRvbkVsZW1lbnQudmFsKCkgJiYgdHVpLnV0aWwuaXNFeGlzdHkoa2V5KSkge1xuICAgICAgICAgICAgYnV0dG9uRWxlbWVudC52YWwoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5RWxlbWVudFswXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZSB0aGUga2V5c1xuICAgICAqIEBwYXJhbSB7YXJyYXl9IHJhd0tleXMgQSBrZXlzIHRoYXQgaXMgc2h1ZmZsZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZUFycmFuZ2VLZXlzOiBmdW5jdGlvbihyYXdLZXlzKSB7XG4gICAgICAgIC8vIEluaXRhaWxpemUgZXhpc3Qga2V5c1xuICAgICAgICB0aGlzLl9yYXdLZXlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHRoaXMuX2NvcHlBcnJheShyYXdLZXlzLCB0aGlzLl9yYXdLZXlzKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleVNlcXVlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW4gY3VzdG9tIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrS2V5IFRoZSBrZXlzIGZvciBjYWxsYmFhayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByYXdJbmRleCBUaGUgdHlwZWQgaW5kZXggbnVtYmVyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2V4Y3V0ZUNhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFja0tleSwgcmF3SW5kZXgpIHtcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fY2FsbGJhY2ssIGNhbGxiYWNrS2V5KSAmJiB0dWkudXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XShyYXdJbmRleCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGtleWJvYXJkIGFycmF5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0Nhc2VUb2dnbGUgV2hldGhlciBjaGFuZ2UgY2FzZSBvciBub3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRSYXdLZXlzOiBmdW5jdGlvbihpc0Nhc2VUb2dnbGUpIHtcbiAgICAgICAgdmFyIHJhd0tleXM7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2NhbGxiYWNrLCAnZ2V0S2V5cycpICYmIHR1aS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2suZ2V0S2V5cykpIHtcbiAgICAgICAgICAgIGlmKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICAgICAgICAgIC8vIE5vdCBzaHVmZmxlZCwgb25seSBnZXQgb3RoZXIgY2FzZSBhcnJheS5cbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jaywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdldCBuZXcga2V5cyBpbmZvcm1hdGlvbiBhcnJheVxuICAgICAgICAgICAgICAgIHJhd0tleXMgPSB0aGlzLl9jYWxsYmFjay5nZXRLZXlzKHRoaXMuX2N1cnJlbnRLZXlUeXBlLCB0aGlzLl9pc0NhcHNMb2NrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZih0dWkudXRpbC5pc0FycmF5KHJhd0tleXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yZUFycmFuZ2VLZXlzKHJhd0tleXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUga2V5cy5cbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLnNodWZmbGUoKTtcbiAgICAgKi9cbiAgICBzaHVmZmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVzZXQgZXhpc3QgdmFsdWVzXG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIEVuZy9Lb3IuXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5sYW5ndWFnZSgpO1xuICAgICAqL1xuICAgIGxhbmd1YWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc0VuZ2xpc2ggPSAhdGhpcy5faXNFbmdsaXNoO1xuICAgICAgICB0aGlzLl9jdXJyZW50S2V5VHlwZSA9IHRoaXMuX2lzRW5nbGlzaCA/ICdlbmdsaXNoJyA6ICdrb3JlYW4nO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSB1cHBlci9sb3dlciBjYXNlLlxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuY2FwcygpO1xuICAgICAqL1xuICAgIGNhcHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzQ2Fwc0xvY2sgPSAhdGhpcy5faXNDYXBzTG9jaztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cyh0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIHN5bWJvbC9udW1iZXIga2V5c1xuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuc3ltYm9sKCk7XG4gICAgICovXG4gICAgc3ltYm9sOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc1N5bWJvbCA9ICF0aGlzLl9pc1N5bWJvbDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc1N5bWJvbCA/ICdzeW1ib2wnIDogJ251bWJlcic7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBsYXN0IHR5cGVkL3RvdWNoZWQgdmFsdWVcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgdHlwZWQga2V5cy5cbiAgICAgKi9cbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc2VydCBibGFua1xuICAgICAqL1xuICAgIHNwYWNlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbiB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5vcGVuKCk7XG4gICAgICovXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2h1ZmZsZSgpO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuY2xvc2UoKTtcbiAgICAgKi9cbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb3NlIHZpZXJ0dWFsIGtleWJvYXJkIHdpdGggY29tcGxhdGUgYnV0dG9uLlxuICAgICAqL1xuICAgIGRvbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbEtleWJvYXJkO1xuIl19
