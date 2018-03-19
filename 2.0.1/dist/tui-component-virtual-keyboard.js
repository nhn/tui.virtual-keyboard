/**
 * tui-component-virtual-keyboard
 * @author NHN Ent. FE Dev Lab <dl_javascript@nhnent.com>
 * @version v1.1.0
 * @license MIT
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
tui.util.defineNamespace('tui.component', {
  VirtualKeyboard: require('./src/js/virtualKeyboard.js')
});

},{"./src/js/virtualKeyboard.js":2}],2:[function(require,module,exports){
/**
 * @fileoverview The module that capture keys typed from user.
 * @author NHN Ent. FE dev team. <dl_javascript@nhnent.com>
 * @dependency jquery-1.8.3.min.js, tui-code-snippet.js
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
    init: function(options) {
        this._initVariables(options || {});

        this._arrangeKeySequence();
        this._refineKeyMap();
        this._initKeyboard(options.container);

        this._attachEvent(options.isClickOnly);
    },

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
        var targetButton = this._getTargetButton(event.target);
        var keyName, keyGroup, index;

          if(!tui.util.isExisty(targetButton)) {
            return false;
        }

        keyName = targetButton.value;
        keyGroup = this._getKeyGroup(keyName);
        index = this._keyMap[keyName].rawIndex;

        if(keyGroup === 'key') {
            this._executeCallback(keyGroup, index);
        } else {
            this[keyName]();
            this._executeCallback(keyName);
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
     * @param {array} [copyArray] New array
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
                // v1.0.0:: Exist case, only change positionIndex
                this._keyMap[value].positionIndex = this._getPositionIndex(value);

                // v1.1.0:: Exist case, change positionIndex with **rawIndex**
                this._keyMap[value].rawIndex = index;
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
     * return index keys in virtual keyboard
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
     * @param {string} callbackKey The keys for callback function
     * @param {number} [rawIndex] The typed index numberd
     * @private
     */
    _executeCallback: function(callbackKey, rawIndex) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ0dWkudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ3R1aS5jb21wb25lbnQnLCB7XG4gIFZpcnR1YWxLZXlib2FyZDogcmVxdWlyZSgnLi9zcmMvanMvdmlydHVhbEtleWJvYXJkLmpzJylcbn0pO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoZSBtb2R1bGUgdGhhdCBjYXB0dXJlIGtleXMgdHlwZWQgZnJvbSB1c2VyLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBkZXYgdGVhbS4gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqIEBkZXBlbmRlbmN5IGpxdWVyeS0xLjguMy5taW4uanMsIHR1aS1jb2RlLXNuaXBwZXQuanNcbiAqL1xuXG4vKipcbiAqIEEgdmlydHVhbCBrZXlib2FyZCBjb21wb25lbnQgaXMgY2FwdHVyaW5nIGt5ZXMgdGhhdCBpcyB0eXBlZCBmcm9tIHVzZXIuXG4gKiBAY29uc3RydWN0b3IgVmlydHVhbEtleWJvYXJkXG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIFZpcnR1YWxLZXlib2FyZCBpbnN0YW5jZSB3aXRoIGFycmF5IG9mIGtleWJvYXJkXG4gKiB2YXIgdmtleWJvYXJkID0gbmV3IHR1aS5jb21wb25lbnQuVmlydHVhbEtleWJvYXJkKHtcbiAqICAgICAgY29udGFpbmVyOiAndmtleWJvYXJkJywgLy8gY29udGFpbmVyIGVsZW1lbnQgaWRcbiAqICAgICAga2V5VHlwZTogJ251bWJlcicsIC8vIGtleWJvYXJkIHR5cGVcbiAqICAgICAgZnVuY3Rpb25zOiB7IC8vIGZ1bmN0aW9uIGtleSBsb2NhdGlvblxuICogICAgICAgICAgc2h1ZmZsZTogMCxcbiAqICAgICAgICAgIGxhbmd1YWdlOiAyLFxuICogICAgICAgICAgY2FwczogMyxcbiAqICAgICAgICAgIHN5bWJvbDogNCxcbiAqICAgICAgICAgIHJlbW92ZTogNSxcbiAqICAgICAgICAgIGNsZWFyOiA5LFxuICogICAgICAgICAgc3BhY2U6IDEwLFxuICogICAgICAgICAgY2xvc2U6IDExLFxuICogICAgICAgICAgZG9uZTogMjBcbiAqICAgICAgfSxcbiAqICAgICAga2V5czogW1wiOVwiLCBcIjNcIiwgXCI1XCIsIFwiMVwiLCBcIlwiLCBcIjdcIiwgXCIwXCIsIFwiMlwiLCBcIjRcIiwgXCI2XCIsIFwiOFwiLCBcIlwiXSwgLy8gYWxsIGtleXMgYnV0IGZ1bmN0aW9uIGtleXMuXG4gKiAgICAgIHRlbXBsYXRlOiB7IC8vIGh0bWwgdGVtcGxhdGV0IGZvciBrZXkgZWxlbWVudHNcbiAqICAgICAgICAgIGtleTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuX2tleVwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiPntLRVl9PC9idXR0b24+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIGJsYW5rOiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIHNodWZmbGU6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0biBidG5fcmVsb2FkXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJzaHVmZmxlXCI+7J6s67Cw7Je0PC9idXR0b24+PC9zcGFuPjwvbGk+JyxcbiAqICAgICAgICAgIHJlbW92ZTogJzxsaSBjbGFzcz1cInN1YmNvbiBsYXN0XCI+PHNwYW4gY2xhc3M9XCJidG4gYnRuX2RlbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwicmVtb3ZlXCI+PHNwYW4gY2xhc3M9XCJzcFwiPuyCreygnDwvc3Bhbj48L2J1dHRvbj48L3NwYW4+PC9saT4nXG4gKiAgICAgIH0sXG4gKiAgICAgIGNhbGxiYWNrOiB7IC8vIGNhbGxiYWNrIGZvciBmdW5jdGlvbiBvciBub3JtYWwga2V5c1xuICogICAgICAgICAga2V5OiBmdW5jdGlvbigpIHsgLy9ydW4gfSwgICAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHVzZXIgdHlwZSBvciB0b3VjaCBrZXkgKGJ1dCBmdW5jdGlvbiBrZXkpXG4gKiAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LFxuICogICAgICAgICAgZ2V0S2V5czogZnVuY3Rpb24oKSB7IC8vcnVuIH0gICAgICAgIC8vIEEgY2FsbGJhY2sgdGhhdCBjYWxsZWQgIHJlYXJyYW5nZSBrZXlzXG4gKiAgICAgIH0sXG4gKiAgICAgIGlzQ2xpY2tPbmx5OiBmYWxzZVxuICogfSk7XG4gKi9cbnZhciBWaXJ0dWFsS2V5Ym9hcmQgPSB0dWkudXRpbC5kZWZpbmVDbGFzcygvKiogQGxlbmRzIFZpcnR1YWxLZXlib2FyZC5wcm90b3R5cGUgKi97XG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLl9pbml0VmFyaWFibGVzKG9wdGlvbnMgfHwge30pO1xuXG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlTZXF1ZW5jZSgpO1xuICAgICAgICB0aGlzLl9yZWZpbmVLZXlNYXAoKTtcbiAgICAgICAgdGhpcy5faW5pdEtleWJvYXJkKG9wdGlvbnMuY29udGFpbmVyKTtcblxuICAgICAgICB0aGlzLl9hdHRhY2hFdmVudChvcHRpb25zLmlzQ2xpY2tPbmx5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBodG1sIHRlbXBsYXRlIGZvciBrZXlzXG4gICAgICogQHJlYWRvbmx5XG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF90ZW1wbGF0ZToge1xuICAgICAgICBrZXk6ICc8bGk+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJ7S0VZfVwiPntLRVl9PC9idXR0b24+PC9saT4nLFxuICAgICAgICBibGFuazogJzxsaT48L2xpPidcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZGF0YSBmb3IgZml4ZWQga2V5cyhmdW5jdGlvbiBrZXlzKVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZml4ZWRLZXlzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgZm9yIHVuZml4ZWQga2V5cycgb3JkZXIuXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Jhd0tleXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgYmxhbmsga2V5cycgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZmllZFJhd0tleXM6IFtdLFxuXG4gICAgLyoqKiBcbiAgICAgKiBUaGUgbWFwIGRhdGEgZm9yIHZlcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2tleU1hcDoge30sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IG9mIGFsbCBvZiBrZXlzKGZpeGVkLCB1bmZpeGVkKScgb3JkZXJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5U2VxdWVuY2VzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIEEgbWFwIGZvciBjYWxsYmFjayBzdXBwb3NlZCB0byBydW4gZm9yIGtleXNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NhbGxiYWNrOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEtleSB0eXBlIG9mIGN1cnJlbnQga2V5Ym9hcmRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2N1cnJlbnRLZXlUeXBlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBlbmdsaXNoIGtleWJvYXJkIG9yIG5vdFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2lzRW5nbGlzaDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHN5bWJvbCBsZXR0ZXIga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNTeW1ib2w6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogd2hldGhlciBjYXBzIGxvY2sgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNDYXBzTG9jazogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnRGcmFnbWVudCBpbnByb210dSBwb29sIGZvciBzYXZpbmcga2V5IGVsZW1lbnRcbiAgICAgKiBAdHlwZSB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kb2N1bWVudEZyYWdtZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwcml2YXRlIGZpbGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgIE9wdGlvbnMgdG8gaW5pdGlhbGl6ZSBrZXlib2FyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXRWYXJpYWJsZXM6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSBvcHRpb25zLmtleVR5cGUgfHwgJ2VuZ2xpc2gnO1xuICAgICAgICB0aGlzLl9maXhlZEtleXMgPSBvcHRpb25zLmZ1bmN0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fcmF3S2V5cyA9IHRoaXMuX2NvcHlBcnJheShvcHRpb25zLmtleXMpO1xuICAgICAgICB0aGlzLl90ZW1wbGF0ZSA9IHR1aS51dGlsLmV4dGVuZCh0aGlzLl90ZW1wbGF0ZSwgb3B0aW9ucy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjayB8fCB7fTtcbiAgICAgICAgdGhpcy5fZG9jdW1lbnRGcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZHMgZXZlbnRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2xpY2tPbmx5IEEgb3B0aW9uIHRvIGRlY2lkZSB0byBpZ25vcmUgdG91Y2hldmVudFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2F0dGFjaEV2ZW50OiBmdW5jdGlvbihpc0NsaWNrT25seSkge1xuICAgICAgICB2YXIgaXNTdXBwb3J0VG91Y2ggPSAhaXNDbGlja09ubHkgJiYgKCgnY3JlYXRlVG91Y2gnIGluIGRvY3VtZW50KSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQpKTtcbiAgICAgICAgdmFyIGV2ZW50VHlwZSA9IGlzU3VwcG9ydFRvdWNoID8gJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJztcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5vbihldmVudFR5cGUsICQucHJveHkodGhpcy5fcHJlc3NLZXlIYW5kbGVyLCB0aGlzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXIgZm9yIGNsaWNrIG9yIHRvdWNoIGJ1dHRvbnNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgQSBldmVudCBvYmplY3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9wcmVzc0tleUhhbmRsZXI6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciB0YXJnZXRCdXR0b24gPSB0aGlzLl9nZXRUYXJnZXRCdXR0b24oZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgdmFyIGtleU5hbWUsIGtleUdyb3VwLCBpbmRleDtcblxuICAgICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eSh0YXJnZXRCdXR0b24pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBrZXlOYW1lID0gdGFyZ2V0QnV0dG9uLnZhbHVlO1xuICAgICAgICBrZXlHcm91cCA9IHRoaXMuX2dldEtleUdyb3VwKGtleU5hbWUpO1xuICAgICAgICBpbmRleCA9IHRoaXMuX2tleU1hcFtrZXlOYW1lXS5yYXdJbmRleDtcblxuICAgICAgICBpZihrZXlHcm91cCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4ZWN1dGVDYWxsYmFjayhrZXlHcm91cCwgaW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpc1trZXlOYW1lXSgpO1xuICAgICAgICAgICAgdGhpcy5fZXhlY3V0ZUNhbGxiYWNrKGtleU5hbWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY2xpY2tlZC90b3VjaGVkIGVsZW1lbnRzIG9mIGtleXNcbiAgICAgKiBAcGFyYW0ge2VsZW1lbnR9IHRhcmdldEVsZW1lbnQgQSBjbGlja2VkL3RvdWNoZWQgaHRtbCBlbGVtZW50XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGFyZ2V0QnV0dG9uOiBmdW5jdGlvbih0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgIGlmKHRhcmdldEVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09PSAnQlVUVE9OJykge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldEVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0YXJnZXRFbGVtZW50KS5wYXJlbnQoJ2J1dHRvbicpWzBdO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBrZXlzIGFycmF5IGZvciB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXJyYW5nZUtleVNlcXVlbmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNvcnRlZEtleXM7XG5cbiAgICAgICAgLy8gU29ydCBmaXhlZCBrZXlzIGJ5IGluZGV4XG4gICAgICAgIHNvcnRlZEtleXMgPSB0aGlzLl9zb3J0Rml4ZWRLZXlzKCk7XG5cbiAgICAgICAgLy8gQ29weSByZWNpZXZlZCBrZXkgYXJyYXlcbiAgICAgICAgdGhpcy5faWRlbnRpZnlSYXdLZXlzKCk7XG4gICAgICAgIHRoaXMuX2NvcHlBcnJheSh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgdGhpcy5fa2V5U2VxdWVuY2VzKTtcblxuICAgICAgICAvLyBJbnNlcnQgZml4ZWQga2V5IFxuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHNvcnRlZEtleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLnNwbGljZSh0aGlzLl9maXhlZEtleXNbdmFsdWVdLCAwLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbmplY3Qga2V5IHZhbHVlIHRvIGZpbmQgYmxhbmsga2V5XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaWRlbnRpZnlSYXdLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJsYW5rQ291bnQgPSAwO1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX3Jhd0tleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodGhpcy5fZ2V0S2V5R3JvdXAodmFsdWUpID09PSAnYmxhbmsnKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAnYmxhbmsnICsgYmxhbmtDb3VudDtcbiAgICAgICAgICAgICAgICBibGFua0NvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9pZGVudGlmaWVkUmF3S2V5c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYXJyYXkgKG5vdCBkZWVwIGNvcHkpXG4gICAgICogQHBhcmFtIHthcnJheX0gb3JpZ2luYWxBcnJheSBPcmlnaW5hbCBhcnJheVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IFtjb3B5QXJyYXldIE5ldyBhcnJheVxuICAgICAqIEByZXR1cm5zIHsqfSBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jb3B5QXJyYXk6IGZ1bmN0aW9uKG9yaWdpbmFsQXJyYXksIGNvcHlBcnJheSkge1xuICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkob3JpZ2luYWxBcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZighdHVpLnV0aWwuaXNBcnJheShvcmlnaW5hbEFycmF5KSkge1xuICAgICAgICAgICAgb3JpZ2luYWxBcnJheSA9IFtvcmlnaW5hbEFycmF5XTtcbiAgICAgICAgfVxuICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkoY29weUFycmF5KSB8fCAhdHVpLnV0aWwuaXNBcnJheShjb3B5QXJyYXkpKSB7XG4gICAgICAgICAgICBjb3B5QXJyYXkgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2gob3JpZ2luYWxBcnJheSwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBjb3B5QXJyYXlbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiBjb3B5QXJyYXk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNvcnQgZml4ZWQga2V5cy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZpeGVkIGtleXMnIGFycmF5IHRoYXQgaXMgc29ydGVkIGJ5IGluZGV4XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc29ydEZpeGVkS2V5cyA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc29ydGVkS2V5cztcbiAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgc29ydGVkS2V5cyA9IHR1aS51dGlsLmtleXModGhpcy5fZml4ZWRLZXlzKSB8fCBbXTtcbiAgICAgICAgc29ydGVkS2V5cy5zb3J0KCQucHJveHkoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZpeGVkS2V5c1thXSAtIHRoaXMuX2ZpeGVkS2V5c1tiXTtcbiAgICAgICAgfSwgdGhpcykpO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRLZXlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgbWFwIGRhdGEgYnkga2V5IGluZm9ybWF0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lS2V5TWFwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fcmVmaW5lRml4ZWRLZXlzKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWRlZmluZSBmaXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZpeGVkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fZml4ZWRLZXlzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICB0aGlzLl9rZXlNYXBba2V5XSA9IHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICByYXdJbmRleDogbnVsbCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbkluZGV4OiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBrZXlHcm91cDogdGhpcy5fZ2V0S2V5R3JvdXAoa2V5KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZGVmaW5lIHVuZml4ZWQga2V5cyBtYXBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVGbG9hdGluZ0tleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2tleU1hcFt2YWx1ZV0pKSB7XG4gICAgICAgICAgICAgICAgLy8gdjEuMC4wOjogRXhpc3QgY2FzZSwgb25seSBjaGFuZ2UgcG9zaXRpb25JbmRleFxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0ucG9zaXRpb25JbmRleCA9IHRoaXMuX2dldFBvc2l0aW9uSW5kZXgodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gdjEuMS4wOjogRXhpc3QgY2FzZSwgY2hhbmdlIHBvc2l0aW9uSW5kZXggd2l0aCAqKnJhd0luZGV4KipcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLnJhd0luZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgbWFwIGRhdGFcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBrZXk6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICByYXdJbmRleDogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uSW5kZXg6IHRoaXMuX2dldFBvc2l0aW9uSW5kZXgodmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICBrZXlHcm91cDogdGhpcy5fZ2V0S2V5R3JvdXAodGhpcy5fcmF3S2V5c1tpbmRleF0pXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiBrZXkgdHlwZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHZhbHVlIFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEga2V5IHR5cGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRLZXlHcm91cDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlHcm91cDtcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fZml4ZWRLZXlzW2tleV0pKSB7XG4gICAgICAgICAgICBrZXlHcm91cCA9ICdmdW5jdGlvbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZihrZXkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAga2V5R3JvdXAgPSAnYmxhbmsnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlHcm91cCA9ICdrZXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlHcm91cDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcmV0dXJuIGluZGV4IGtleXMgaW4gdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge251bWJlcn0gQSBrZXkgaW5kZXhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRQb3NpdGlvbkluZGV4OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aDtcblxuICAgICAgICBmb3IoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKGtleSA9PT0gdGhpcy5fa2V5U2VxdWVuY2VzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBWaXJ0dWFsS2V5Ym9hcmQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIEEgY29udGFpbmVyIGlkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdEtleWJvYXJkOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKGNvbnRhaW5lcklkKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb250YWluZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVySWQgQSBjb250YWluZXIgaWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0Q29udGFpbmVyOiBmdW5jdGlvbihjb250YWluZXJJZCkge1xuICAgICAgICBpZih0aGlzLl8kY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50KTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lciA9ICQoJyMnICsgY29udGFpbmVySWQpO1xuICAgICAgICAgICAgaWYoIXR1aS51dGlsLmlzSFRNTFRhZyh0aGlzLl8kY29udGFpbmVyWzBdKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIgPSB0aGlzLl9jcmVhdGVDb250YWluZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGNvbnRhaW5lclxuICAgICAqIEByZXR1cm5zIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZUNvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb250YWluZXJJZCA9ICd2ay0nICsgdGhpcy5fZ2V0VGltZSgpLFxuICAgICAgICAgICAgY29udGFpbmVyID0gJCgnPHVsIGlkPScgKyBjb250YWluZXJJZCArICc+Jyk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuYXBwZW5kKGNvbnRhaW5lcik7XG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiBjdXJyZW50IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7bWlsbGlzZWNvbmR9IERhdGUgdGltZSBieSBtaWxsaXNlY29uZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRpbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGltZVN0YW1wO1xuICAgICAgICBpZihEYXRlLm5vdykge1xuICAgICAgICAgICAgdGltZVN0YW1wID0gRGF0ZS5ub3coKSB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGltZVN0YW1wO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcnJhbmdlIGtleXMgaW4gdmlydHVhbCBrZXlib2FyZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hcnJhbmdlS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBrZXlFbGVtZW50O1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2tleVNlcXVlbmNlcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQ7XG4gICAgICAgICAgICBpZighdHVpLnV0aWwuaXNIVE1MVGFnKGtleUVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50ID0ga2V5RWxlbWVudCA9IHRoaXMuX2NyZWF0ZUtleUVsZW1lbnQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5hcHBlbmQoa2V5RWxlbWVudCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGVtcGxhdGUgYnkga2V5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlHcm91cCBBIGtleSB0eXBlIHRvIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdG8gY3JlYXRlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUZW1wbGF0ZTogZnVuY3Rpb24oa2V5R3JvdXAsIGtleSkge1xuICAgICAgICB2YXIgdGVtcGxhdGU7XG5cbiAgICAgICAgaWYoa2V5R3JvdXAgPT09ICdibGFuaycpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGUuYmxhbms7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlW2tleV0gfHwgdGhpcy5fdGVtcGxhdGUua2V5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkoa2V5KSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKC97S0VZfS9nLCBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGtleSBidXR0b24gYW5kIHJldHVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5cyB0byBjcmVhdGVcbiAgICAgKiBAcmV0dXJucyB7ZWxlbWVudH0gQSBrZXkgYnV0dG9uIGVsZW1lbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVLZXlFbGVtZW50OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleUdyb3VwID0gdGhpcy5fa2V5TWFwW2tleV0ua2V5R3JvdXAsXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX2dldFRlbXBsYXRlKGtleUdyb3VwLCBrZXkpLFxuICAgICAgICAgICAga2V5RWxlbWVudCA9ICQodGVtcGxhdGUpLFxuICAgICAgICAgICAgYnV0dG9uRWxlbWVudCA9IGtleUVsZW1lbnQuZmluZCgnYnV0dG9uJyk7XG5cbiAgICAgICAgaWYoIWJ1dHRvbkVsZW1lbnQudmFsKCkgJiYgdHVpLnV0aWwuaXNFeGlzdHkoa2V5KSkge1xuICAgICAgICAgICAgYnV0dG9uRWxlbWVudC52YWwoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5RWxlbWVudFswXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZSB0aGUga2V5c1xuICAgICAqIEBwYXJhbSB7YXJyYXl9IHJhd0tleXMgQSBrZXlzIHRoYXQgaXMgc2h1ZmZsZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZUFycmFuZ2VLZXlzOiBmdW5jdGlvbihyYXdLZXlzKSB7XG4gICAgICAgIC8vIEluaXRhaWxpemUgZXhpc3Qga2V5c1xuICAgICAgICB0aGlzLl9yYXdLZXlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHRoaXMuX2NvcHlBcnJheShyYXdLZXlzLCB0aGlzLl9yYXdLZXlzKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleVNlcXVlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlZmluZUZsb2F0aW5nS2V5cygpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW4gY3VzdG9tIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrS2V5IFRoZSBrZXlzIGZvciBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcmF3SW5kZXhdIFRoZSB0eXBlZCBpbmRleCBudW1iZXJkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZXhlY3V0ZUNhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFja0tleSwgcmF3SW5kZXgpIHtcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fY2FsbGJhY2ssIGNhbGxiYWNrS2V5KSAmJiB0dWkudXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrW2NhbGxiYWNrS2V5XShyYXdJbmRleCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGtleWJvYXJkIGFycmF5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0Nhc2VUb2dnbGUgV2hldGhlciBjaGFuZ2UgY2FzZSBvciBub3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRSYXdLZXlzOiBmdW5jdGlvbihpc0Nhc2VUb2dnbGUpIHtcbiAgICAgICAgdmFyIHJhd0tleXM7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2NhbGxiYWNrLCAnZ2V0S2V5cycpICYmIHR1aS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2suZ2V0S2V5cykpIHtcbiAgICAgICAgICAgIGlmKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICAgICAgICAgIC8vIE5vdCBzaHVmZmxlZCwgb25seSBnZXQgb3RoZXIgY2FzZSBhcnJheS5cbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jaywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdldCBuZXcga2V5cyBpbmZvcm1hdGlvbiBhcnJheVxuICAgICAgICAgICAgICAgIHJhd0tleXMgPSB0aGlzLl9jYWxsYmFjay5nZXRLZXlzKHRoaXMuX2N1cnJlbnRLZXlUeXBlLCB0aGlzLl9pc0NhcHNMb2NrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZih0dWkudXRpbC5pc0FycmF5KHJhd0tleXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yZUFycmFuZ2VLZXlzKHJhd0tleXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUga2V5cy5cbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLnNodWZmbGUoKTtcbiAgICAgKi9cbiAgICBzaHVmZmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVzZXQgZXhpc3QgdmFsdWVzXG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIEVuZy9Lb3IuXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5sYW5ndWFnZSgpO1xuICAgICAqL1xuICAgIGxhbmd1YWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc0VuZ2xpc2ggPSAhdGhpcy5faXNFbmdsaXNoO1xuICAgICAgICB0aGlzLl9jdXJyZW50S2V5VHlwZSA9IHRoaXMuX2lzRW5nbGlzaCA/ICdlbmdsaXNoJyA6ICdrb3JlYW4nO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSB1cHBlci9sb3dlciBjYXNlLlxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuY2FwcygpO1xuICAgICAqL1xuICAgIGNhcHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzQ2Fwc0xvY2sgPSAhdGhpcy5faXNDYXBzTG9jaztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cyh0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIHN5bWJvbC9udW1iZXIga2V5c1xuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuc3ltYm9sKCk7XG4gICAgICovXG4gICAgc3ltYm9sOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc1N5bWJvbCA9ICF0aGlzLl9pc1N5bWJvbDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc1N5bWJvbCA/ICdzeW1ib2wnIDogJ251bWJlcic7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIHRoZSBsYXN0IHR5cGVkL3RvdWNoZWQgdmFsdWVcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgdHlwZWQga2V5cy5cbiAgICAgKi9cbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc2VydCBibGFua1xuICAgICAqL1xuICAgIHNwYWNlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbiB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5vcGVuKCk7XG4gICAgICovXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2h1ZmZsZSgpO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuY2xvc2UoKTtcbiAgICAgKi9cbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb3NlIHZpZXJ0dWFsIGtleWJvYXJkIHdpdGggY29tcGxhdGUgYnV0dG9uLlxuICAgICAqL1xuICAgIGRvbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbEtleWJvYXJkO1xuIl19
