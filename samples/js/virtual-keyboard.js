/**
 * component-virtual-keyboard
 * @author NHN Ent. FE Dev team.<dl_javascript@nhnent.com>
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInR1aS51dGlsLmRlZmluZU5hbWVzcGFjZSgndHVpLmNvbXBvbmVudCcsIHtcbiAgVmlydHVhbEtleWJvYXJkOiByZXF1aXJlKCcuL3NyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMnKVxufSk7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgVGhlIG1vZHVsZSB0aGF0IGNhcHR1cmUga2V5cyB0eXBlZCBmcm9tIHVzZXIuXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIGRldiB0ZWFtLiA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICogQGRlcGVuZGVuY3kganF1ZXJ5LTEuOC4zLm1pbi5qcywgdHVpLWNvZGUtc25pcHBldC5qc1xuICovXG5cbi8qKlxuICogQSB2aXJ0dWFsIGtleWJvYXJkIGNvbXBvbmVudCBpcyBjYXB0dXJpbmcga3llcyB0aGF0IGlzIHR5cGVkIGZyb20gdXNlci5cbiAqIEBjb25zdHJ1Y3RvciBWaXJ0dWFsS2V5Ym9hcmRcbiAqIEBleGFtcGxlXG4gKiAvLyBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGluc3RhbmNlIHdpdGggYXJyYXkgb2Yga2V5Ym9hcmRcbiAqIHZhciB2a2V5Ym9hcmQgPSBuZXcgdHVpLmNvbXBvbmVudC5WaXJ0dWFsS2V5Ym9hcmQoe1xuICogICAgICBjb250YWluZXI6ICd2a2V5Ym9hcmQnLCAvLyBjb250YWluZXIgZWxlbWVudCBpZFxuICogICAgICBrZXlUeXBlOiAnbnVtYmVyJywgLy8ga2V5Ym9hcmQgdHlwZVxuICogICAgICBmdW5jdGlvbnM6IHsgLy8gZnVuY3Rpb24ga2V5IGxvY2F0aW9uXG4gKiAgICAgICAgICBzaHVmZmxlOiAwLFxuICogICAgICAgICAgbGFuZ3VhZ2U6IDIsXG4gKiAgICAgICAgICBjYXBzOiAzLFxuICogICAgICAgICAgc3ltYm9sOiA0LFxuICogICAgICAgICAgcmVtb3ZlOiA1LFxuICogICAgICAgICAgY2xlYXI6IDksXG4gKiAgICAgICAgICBzcGFjZTogMTAsXG4gKiAgICAgICAgICBjbG9zZTogMTEsXG4gKiAgICAgICAgICBkb25lOiAyMFxuICogICAgICB9LFxuICogICAgICBrZXlzOiBbXCI5XCIsIFwiM1wiLCBcIjVcIiwgXCIxXCIsIFwiXCIsIFwiN1wiLCBcIjBcIiwgXCIyXCIsIFwiNFwiLCBcIjZcIiwgXCI4XCIsIFwiXCJdLCAvLyBhbGwga2V5cyBidXQgZnVuY3Rpb24ga2V5cy5cbiAqICAgICAgdGVtcGxhdGU6IHsgLy8gaHRtbCB0ZW1wbGF0ZXQgZm9yIGtleSBlbGVtZW50c1xuICogICAgICAgICAga2V5OiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCI+e0tFWX08L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgYmxhbms6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0bl9rZXlcIj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgc2h1ZmZsZTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuIGJ0bl9yZWxvYWRcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cInNodWZmbGVcIj7snqzrsLDsl7Q8L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgcmVtb3ZlOiAnPGxpIGNsYXNzPVwic3ViY29uIGxhc3RcIj48c3BhbiBjbGFzcz1cImJ0biBidG5fZGVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJyZW1vdmVcIj48c3BhbiBjbGFzcz1cInNwXCI+7IKt7KCcPC9zcGFuPjwvYnV0dG9uPjwvc3Bhbj48L2xpPidcbiAqICAgICAgfSxcbiAqICAgICAgY2FsbGJhY2s6IHsgLy8gY2FsbGJhY2sgZm9yIGZ1bmN0aW9uIG9yIG5vcm1hbCBrZXlzXG4gKiAgICAgICAgICBrZXk6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LCAgICAgICAgICAvLyBBIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdXNlciB0eXBlIG9yIHRvdWNoIGtleSAoYnV0IGZ1bmN0aW9uIGtleSlcbiAqICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7IC8vcnVuIH0sXG4gKiAgICAgICAgICBnZXRLZXlzOiBmdW5jdGlvbigpIHsgLy9ydW4gfSAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGNhbGxlZCAgcmVhcnJhbmdlIGtleXNcbiAqICAgICAgfSxcbiAqICAgICAgaXNDbGlja09ubHk6IGZhbHNlXG4gKiB9KTtcbiAqL1xudmFyIFZpcnR1YWxLZXlib2FyZCA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgVmlydHVhbEtleWJvYXJkLnByb3RvdHlwZSAqL3tcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGh0bWwgdGVtcGxhdGUgZm9yIGtleXNcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3RlbXBsYXRlOiB7XG4gICAgICAgIGtleTogJzxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIntLRVl9XCI+e0tFWX08L2J1dHRvbj48L2xpPicsXG4gICAgICAgIGJsYW5rOiAnPGxpPjwvbGk+J1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBIG1hcCBkYXRhIGZvciBmaXhlZCBrZXlzKGZ1bmN0aW9uIGtleXMpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9maXhlZEtleXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgdW5maXhlZCBrZXlzJyBvcmRlci5cbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmF3S2V5czogW10sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IGZvciBibGFuayBrZXlzJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmaWVkUmF3S2V5czogW10sXG5cbiAgICAvKioqIFxuICAgICAqIFRoZSBtYXAgZGF0YSBmb3IgdmVydHVhbCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5TWFwOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgb2YgYWxsIG9mIGtleXMoZml4ZWQsIHVuZml4ZWQpJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9rZXlTZXF1ZW5jZXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZm9yIGNhbGxiYWNrIHN1cHBvc2VkIHRvIHJ1biBmb3Iga2V5c1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY2FsbGJhY2s6IHt9LFxuXG4gICAgLyoqXG4gICAgICogS2V5IHR5cGUgb2YgY3VycmVudCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3VycmVudEtleVR5cGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGVuZ2xpc2gga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNFbmdsaXNoOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgc3ltYm9sIGxldHRlciBrZXlib2FyZCBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc1N5bWJvbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiB3aGV0aGVyIGNhcHMgbG9jayBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc0NhcHNMb2NrOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudEZyYWdtZW50IGlucHJvbXR1IHBvb2wgZm9yIHNhdmluZyBrZXkgZWxlbWVudFxuICAgICAqIEB0eXBlIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RvY3VtZW50RnJhZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0YWxpemUgXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyB0byBpbml0aWFsaXplIGNvbXBvbmVudFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5faW5pdFZhcmlhYmxlcyhvcHRpb25zIHx8IHt9KTtcblxuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5U2VxdWVuY2UoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lS2V5TWFwKCk7XG4gICAgICAgIHRoaXMuX2luaXRLZXlib2FyZChvcHRpb25zLmNvbnRhaW5lcik7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRXZlbnQob3B0aW9ucy5pc0NsaWNrT25seSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJpdmF0ZSBmaWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBPcHRpb25zIHRvIGluaXRpYWxpemUga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0VmFyaWFibGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gb3B0aW9ucy5rZXlUeXBlIHx8ICdlbmdsaXNoJztcbiAgICAgICAgdGhpcy5fZml4ZWRLZXlzID0gb3B0aW9ucy5mdW5jdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3Jhd0tleXMgPSB0aGlzLl9jb3B5QXJyYXkob3B0aW9ucy5rZXlzKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGUgPSB0dWkudXRpbC5leHRlbmQodGhpcy5fdGVtcGxhdGUsIG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2sgfHwge307XG4gICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmRzIGV2ZW50XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NsaWNrT25seSBBIG9wdGlvbiB0byBkZWNpZGUgdG8gaWdub3JlIHRvdWNoZXZlbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oaXNDbGlja09ubHkpIHtcbiAgICAgICAgdmFyIGlzU3VwcG9ydFRvdWNoID0gIWlzQ2xpY2tPbmx5ICYmICgoJ2NyZWF0ZVRvdWNoJyBpbiBkb2N1bWVudCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50KSk7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBpc1N1cHBvcnRUb3VjaCA/ICd0b3VjaHN0YXJ0JyA6ICdjbGljayc7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIub24oZXZlbnRUeXBlLCAkLnByb3h5KHRoaXMuX3ByZXNzS2V5SGFuZGxlciwgdGhpcykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVyIGZvciBjbGljayBvciB0b3VjaCBidXR0b25zXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IEEgZXZlbnQgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcHJlc3NLZXlIYW5kbGVyOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0QnV0dG9uID0gdGhpcy5fZ2V0VGFyZ2V0QnV0dG9uKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIHZhciBrZXlOYW1lLCBrZXlHcm91cCwgaW5kZXg7XG5cbiAgICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkodGFyZ2V0QnV0dG9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5TmFtZSA9IHRhcmdldEJ1dHRvbi52YWx1ZTtcbiAgICAgICAga2V5R3JvdXAgPSB0aGlzLl9nZXRLZXlHcm91cChrZXlOYW1lKTtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9rZXlNYXBba2V5TmFtZV0ucmF3SW5kZXg7XG5cbiAgICAgICAgaWYoa2V5R3JvdXAgPT09ICdrZXknKSB7XG4gICAgICAgICAgICB0aGlzLl9leGVjdXRlQ2FsbGJhY2soa2V5R3JvdXAsIGluZGV4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXNba2V5TmFtZV0oKTtcbiAgICAgICAgICAgIHRoaXMuX2V4ZWN1dGVDYWxsYmFjayhrZXlOYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGNsaWNrZWQvdG91Y2hlZCBlbGVtZW50cyBvZiBrZXlzXG4gICAgICogQHBhcmFtIHtlbGVtZW50fSB0YXJnZXRFbGVtZW50IEEgY2xpY2tlZC90b3VjaGVkIGh0bWwgZWxlbWVudFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRhcmdldEJ1dHRvbjogZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuICAgICAgICBpZih0YXJnZXRFbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGFyZ2V0RWxlbWVudCkucGFyZW50KCdidXR0b24nKVswXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUga2V5cyBhcnJheSBmb3IgdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FycmFuZ2VLZXlTZXF1ZW5jZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzb3J0ZWRLZXlzO1xuXG4gICAgICAgIC8vIFNvcnQgZml4ZWQga2V5cyBieSBpbmRleFxuICAgICAgICBzb3J0ZWRLZXlzID0gdGhpcy5fc29ydEZpeGVkS2V5cygpO1xuXG4gICAgICAgIC8vIENvcHkgcmVjaWV2ZWQga2V5IGFycmF5XG4gICAgICAgIHRoaXMuX2lkZW50aWZ5UmF3S2V5cygpO1xuICAgICAgICB0aGlzLl9jb3B5QXJyYXkodGhpcy5faWRlbnRpZmllZFJhd0tleXMsIHRoaXMuX2tleVNlcXVlbmNlcyk7XG5cbiAgICAgICAgLy8gSW5zZXJ0IGZpeGVkIGtleSBcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChzb3J0ZWRLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5zcGxpY2UodGhpcy5fZml4ZWRLZXlzW3ZhbHVlXSwgMCwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5qZWN0IGtleSB2YWx1ZSB0byBmaW5kIGJsYW5rIGtleVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2lkZW50aWZ5UmF3S2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBibGFua0NvdW50ID0gMDtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9yYXdLZXlzLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX2dldEtleUdyb3VwKHZhbHVlKSA9PT0gJ2JsYW5rJykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJ2JsYW5rJyArIGJsYW5rQ291bnQ7XG4gICAgICAgICAgICAgICAgYmxhbmtDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faWRlbnRpZmllZFJhd0tleXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGFycmF5IChub3QgZGVlcCBjb3B5KVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IG9yaWdpbmFsQXJyYXkgT3JpZ2luYWwgYXJyYXlcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBbY29weUFycmF5XSBOZXcgYXJyYXlcbiAgICAgKiBAcmV0dXJucyB7Kn0gXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY29weUFycmF5OiBmdW5jdGlvbihvcmlnaW5hbEFycmF5LCBjb3B5QXJyYXkpIHtcbiAgICAgICAgaWYoIXR1aS51dGlsLmlzRXhpc3R5KG9yaWdpbmFsQXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYoIXR1aS51dGlsLmlzQXJyYXkob3JpZ2luYWxBcnJheSkpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQXJyYXkgPSBbb3JpZ2luYWxBcnJheV07XG4gICAgICAgIH1cbiAgICAgICAgaWYoIXR1aS51dGlsLmlzRXhpc3R5KGNvcHlBcnJheSkgfHwgIXR1aS51dGlsLmlzQXJyYXkoY29weUFycmF5KSkge1xuICAgICAgICAgICAgY29weUFycmF5ID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKG9yaWdpbmFsQXJyYXksIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29weUFycmF5W2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gY29weUFycmF5O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTb3J0IGZpeGVkIGtleXMuXG4gICAgICogQHJldHVybnMge0FycmF5fSBGaXhlZCBrZXlzJyBhcnJheSB0aGF0IGlzIHNvcnRlZCBieSBpbmRleFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3NvcnRGaXhlZEtleXMgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNvcnRlZEtleXM7XG4gICAgICAgIHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGggPSAwO1xuXG4gICAgICAgIHNvcnRlZEtleXMgPSB0dWkudXRpbC5rZXlzKHRoaXMuX2ZpeGVkS2V5cykgfHwgW107XG4gICAgICAgIHNvcnRlZEtleXMuc29ydCgkLnByb3h5KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9maXhlZEtleXNbYV0gLSB0aGlzLl9maXhlZEtleXNbYl07XG4gICAgICAgIH0sIHRoaXMpKTtcblxuICAgICAgICByZXR1cm4gc29ydGVkS2V5cztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIG1hcCBkYXRhIGJ5IGtleSBpbmZvcm1hdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUtleU1hcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3JlZmluZUZpeGVkS2V5cygpO1xuICAgICAgICB0aGlzLl9yZWZpbmVGbG9hdGluZ0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVkZWZpbmUgZml4ZWQga2V5cyBtYXBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVGaXhlZEtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0dWkudXRpbC5mb3JFYWNoKHRoaXMuX2ZpeGVkS2V5cywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgdGhpcy5fa2V5TWFwW2tleV0gPSB7XG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgcmF3SW5kZXg6IG51bGwsXG4gICAgICAgICAgICAgICAgcG9zaXRpb25JbmRleDogdmFsdWUsXG4gICAgICAgICAgICAgICAga2V5R3JvdXA6IHRoaXMuX2dldEtleUdyb3VwKGtleSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWRlZmluZSB1bmZpeGVkIGtleXMgbWFwXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lRmxvYXRpbmdLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9rZXlNYXBbdmFsdWVdKSkge1xuICAgICAgICAgICAgICAgIC8vIHYxLjAuMDo6IEV4aXN0IGNhc2UsIG9ubHkgY2hhbmdlIHBvc2l0aW9uSW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLnBvc2l0aW9uSW5kZXggPSB0aGlzLl9nZXRQb3NpdGlvbkluZGV4KHZhbHVlKTtcblxuICAgICAgICAgICAgICAgIC8vIHYxLjEuMDo6IEV4aXN0IGNhc2UsIGNoYW5nZSBwb3NpdGlvbkluZGV4IHdpdGggKipyYXdJbmRleCoqXG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXS5yYXdJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IG1hcCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmF3SW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkluZGV4OiB0aGlzLl9nZXRQb3NpdGlvbkluZGV4KHZhbHVlKSxcbiAgICAgICAgICAgICAgICAgICAga2V5R3JvdXA6IHRoaXMuX2dldEtleUdyb3VwKHRoaXMuX3Jhd0tleXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4ga2V5IHR5cGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB2YWx1ZSBcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIGtleSB0eXBlXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0S2V5R3JvdXA6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5R3JvdXA7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2ZpeGVkS2V5c1trZXldKSkge1xuICAgICAgICAgICAga2V5R3JvdXAgPSAnZnVuY3Rpb24nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoa2V5ID09PSAnJykge1xuICAgICAgICAgICAgICAgIGtleUdyb3VwID0gJ2JsYW5rJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5R3JvdXAgPSAna2V5JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5R3JvdXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIHJldHVybiBpbmRleCBrZXlzIGluIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHZhbHVlIFxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IEEga2V5IGluZGV4XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0UG9zaXRpb25JbmRleDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMuX2tleVNlcXVlbmNlcy5sZW5ndGg7XG5cbiAgICAgICAgZm9yKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihrZXkgPT09IHRoaXMuX2tleVNlcXVlbmNlc1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVmlydHVhbEtleWJvYXJkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJJZCBBIGNvbnRhaW5lciBpZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXRLZXlib2FyZDogZnVuY3Rpb24oY29udGFpbmVySWQpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcihjb250YWluZXJJZCk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIEEgY29udGFpbmVyIGlkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdENvbnRhaW5lcjogZnVuY3Rpb24oY29udGFpbmVySWQpIHtcbiAgICAgICAgaWYodGhpcy5fJGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9pZGVudGlmaWVkUmF3S2V5cywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kb2N1bWVudEZyYWdtZW50LmFwcGVuZENoaWxkKHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudCk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIgPSAkKCcjJyArIGNvbnRhaW5lcklkKTtcbiAgICAgICAgICAgIGlmKCF0dWkudXRpbC5pc0hUTUxUYWcodGhpcy5fJGNvbnRhaW5lclswXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gdGhpcy5fY3JlYXRlQ29udGFpbmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFZpcnR1YWxLZXlib2FyZCBjb250YWluZXJcbiAgICAgKiBAcmV0dXJucyB7ZWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29udGFpbmVySWQgPSAndmstJyArIHRoaXMuX2dldFRpbWUoKSxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9ICQoJzx1bCBpZD0nICsgY29udGFpbmVySWQgKyAnPicpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFwcGVuZChjb250YWluZXIpO1xuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gY3VycmVudCB0aW1lXG4gICAgICogQHJldHVybnMge21pbGxpc2Vjb25kfSBEYXRlIHRpbWUgYnkgbWlsbGlzZWNvbmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUaW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVTdGFtcDtcbiAgICAgICAgaWYoRGF0ZS5ub3cpIHtcbiAgICAgICAgICAgIHRpbWVTdGFtcCA9IERhdGUubm93KCkgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbWVTdGFtcDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXJyYW5nZSBrZXlzIGluIHZpcnR1YWwga2V5Ym9hcmQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXJyYW5nZUtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIga2V5RWxlbWVudDtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9rZXlTZXF1ZW5jZXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBrZXlFbGVtZW50ID0gdGhpcy5fa2V5TWFwW3ZhbHVlXS5lbGVtZW50O1xuICAgICAgICAgICAgaWYoIXR1aS51dGlsLmlzSFRNTFRhZyhrZXlFbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudCA9IGtleUVsZW1lbnQgPSB0aGlzLl9jcmVhdGVLZXlFbGVtZW50KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuXyRjb250YWluZXIuYXBwZW5kKGtleUVsZW1lbnQpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRlbXBsYXRlIGJ5IGtleS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5R3JvdXAgQSBrZXkgdHlwZSB0byBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEEga2V5IHRvIGNyZWF0ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGVtcGxhdGU6IGZ1bmN0aW9uKGtleUdyb3VwLCBrZXkpIHtcbiAgICAgICAgdmFyIHRlbXBsYXRlO1xuXG4gICAgICAgIGlmKGtleUdyb3VwID09PSAnYmxhbmsnKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlLmJsYW5rO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZVtrZXldIHx8IHRoaXMuX3RlbXBsYXRlLmtleTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgve0tFWX0vZywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBrZXkgYnV0dG9uIGFuZCByZXR1cm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleXMgdG8gY3JlYXRlXG4gICAgICogQHJldHVybnMge2VsZW1lbnR9IEEga2V5IGJ1dHRvbiBlbGVtZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlS2V5RWxlbWVudDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlHcm91cCA9IHRoaXMuX2tleU1hcFtrZXldLmtleUdyb3VwLFxuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl9nZXRUZW1wbGF0ZShrZXlHcm91cCwga2V5KSxcbiAgICAgICAgICAgIGtleUVsZW1lbnQgPSAkKHRlbXBsYXRlKSxcbiAgICAgICAgICAgIGJ1dHRvbkVsZW1lbnQgPSBrZXlFbGVtZW50LmZpbmQoJ2J1dHRvbicpO1xuXG4gICAgICAgIGlmKCFidXR0b25FbGVtZW50LnZhbCgpICYmIHR1aS51dGlsLmlzRXhpc3R5KGtleSkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkVsZW1lbnQudmFsKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleUVsZW1lbnRbMF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGUgdGhlIGtleXNcbiAgICAgKiBAcGFyYW0ge2FycmF5fSByYXdLZXlzIEEga2V5cyB0aGF0IGlzIHNodWZmbGVkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVBcnJhbmdlS2V5czogZnVuY3Rpb24ocmF3S2V5cykge1xuICAgICAgICAvLyBJbml0YWlsaXplIGV4aXN0IGtleXNcbiAgICAgICAgdGhpcy5fcmF3S2V5cy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcblxuICAgICAgICB0aGlzLl9jb3B5QXJyYXkocmF3S2V5cywgdGhpcy5fcmF3S2V5cyk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlTZXF1ZW5jZSgpO1xuICAgICAgICB0aGlzLl9yZWZpbmVGbG9hdGluZ0tleXMoKTtcbiAgICAgICAgdGhpcy5fYXJyYW5nZUtleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUnVuIGN1c3RvbSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja0tleSBUaGUga2V5cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3Jhd0luZGV4XSBUaGUgdHlwZWQgaW5kZXggbnVtYmVyZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2V4ZWN1dGVDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2tLZXksIHJhd0luZGV4KSB7XG4gICAgICAgIGlmKHR1aS51dGlsLmlzRXhpc3R5KHRoaXMuX2NhbGxiYWNrLCBjYWxsYmFja0tleSkgJiYgdHVpLnV0aWwuaXNGdW5jdGlvbih0aGlzLl9jYWxsYmFja1tjYWxsYmFja0tleV0pKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFja1tjYWxsYmFja0tleV0ocmF3SW5kZXgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBrZXlib2FyZCBhcnJheVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDYXNlVG9nZ2xlIFdoZXRoZXIgY2hhbmdlIGNhc2Ugb3Igbm90XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0UmF3S2V5czogZnVuY3Rpb24oaXNDYXNlVG9nZ2xlKSB7XG4gICAgICAgIHZhciByYXdLZXlzO1xuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9jYWxsYmFjaywgJ2dldEtleXMnKSAmJiB0dWkudXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2NhbGxiYWNrLmdldEtleXMpKSB7XG4gICAgICAgICAgICBpZihpc0Nhc2VUb2dnbGUpIHtcbiAgICAgICAgICAgICAgICAvLyBOb3Qgc2h1ZmZsZWQsIG9ubHkgZ2V0IG90aGVyIGNhc2UgYXJyYXkuXG4gICAgICAgICAgICAgICAgcmF3S2V5cyA9IHRoaXMuX2NhbGxiYWNrLmdldEtleXModGhpcy5fY3VycmVudEtleVR5cGUsIHRoaXMuX2lzQ2Fwc0xvY2ssIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV3IGtleXMgaW5mb3JtYXRpb24gYXJyYXlcbiAgICAgICAgICAgICAgICByYXdLZXlzID0gdGhpcy5fY2FsbGJhY2suZ2V0S2V5cyh0aGlzLl9jdXJyZW50S2V5VHlwZSwgdGhpcy5faXNDYXBzTG9jayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYodHVpLnV0aWwuaXNBcnJheShyYXdLZXlzKSkge1xuICAgICAgICAgICAgdGhpcy5fcmVBcnJhbmdlS2V5cyhyYXdLZXlzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaHVmZmxlIGtleXMuXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5zaHVmZmxlKCk7XG4gICAgICovXG4gICAgc2h1ZmZsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFJlc2V0IGV4aXN0IHZhbHVlc1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBFbmcvS29yLlxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQubGFuZ3VhZ2UoKTtcbiAgICAgKi9cbiAgICBsYW5ndWFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNFbmdsaXNoID0gIXRoaXMuX2lzRW5nbGlzaDtcbiAgICAgICAgdGhpcy5fY3VycmVudEtleVR5cGUgPSB0aGlzLl9pc0VuZ2xpc2ggPyAnZW5nbGlzaCcgOiAna29yZWFuJztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgdXBwZXIvbG93ZXIgY2FzZS5cbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLmNhcHMoKTtcbiAgICAgKi9cbiAgICBjYXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faW5pdENvbnRhaW5lcigpO1xuICAgICAgICB0aGlzLl9pc0NhcHNMb2NrID0gIXRoaXMuX2lzQ2Fwc0xvY2s7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXModHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSBzeW1ib2wvbnVtYmVyIGtleXNcbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLnN5bWJvbCgpO1xuICAgICAqL1xuICAgIHN5bWJvbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNTeW1ib2wgPSAhdGhpcy5faXNTeW1ib2w7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gdGhpcy5faXNTeW1ib2wgPyAnc3ltYm9sJyA6ICdudW1iZXInO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSB0aGUgbGFzdCB0eXBlZC90b3VjaGVkIHZhbHVlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIHR5cGVkIGtleXMuXG4gICAgICovXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnQgYmxhbmtcbiAgICAgKi9cbiAgICBzcGFjZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW4gdmlydHVhbCBrZXlib2FyZFxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQub3BlbigpO1xuICAgICAqL1xuICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNodWZmbGUoKTtcbiAgICAgICAgdGhpcy5fJGNvbnRhaW5lci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsb3NlIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLmNsb3NlKCk7XG4gICAgICovXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSB2aWVydHVhbCBrZXlib2FyZCB3aXRoIGNvbXBsYXRlIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxLZXlib2FyZDtcbiJdfQ==
