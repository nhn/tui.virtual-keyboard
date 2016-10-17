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
        keyGroup = this._keyMap[keyName].keyGroup;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInR1aS51dGlsLmRlZmluZU5hbWVzcGFjZSgndHVpLmNvbXBvbmVudCcsIHtcbiAgVmlydHVhbEtleWJvYXJkOiByZXF1aXJlKCcuL3NyYy9qcy92aXJ0dWFsS2V5Ym9hcmQuanMnKVxufSk7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgVGhlIG1vZHVsZSB0aGF0IGNhcHR1cmUga2V5cyB0eXBlZCBmcm9tIHVzZXIuXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIGRldiB0ZWFtLiA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICogQGRlcGVuZGVuY3kganF1ZXJ5LTEuOC4zLm1pbi5qcywgdHVpLWNvZGUtc25pcHBldC5qc1xuICovXG5cbi8qKlxuICogQSB2aXJ0dWFsIGtleWJvYXJkIGNvbXBvbmVudCBpcyBjYXB0dXJpbmcga3llcyB0aGF0IGlzIHR5cGVkIGZyb20gdXNlci5cbiAqIEBjb25zdHJ1Y3RvciBWaXJ0dWFsS2V5Ym9hcmRcbiAqIEBleGFtcGxlXG4gKiAvLyBDcmVhdGUgVmlydHVhbEtleWJvYXJkIGluc3RhbmNlIHdpdGggYXJyYXkgb2Yga2V5Ym9hcmRcbiAqIHZhciB2a2V5Ym9hcmQgPSBuZXcgdHVpLmNvbXBvbmVudC5WaXJ0dWFsS2V5Ym9hcmQoe1xuICogICAgICBjb250YWluZXI6ICd2a2V5Ym9hcmQnLCAvLyBjb250YWluZXIgZWxlbWVudCBpZFxuICogICAgICBrZXlUeXBlOiAnbnVtYmVyJywgLy8ga2V5Ym9hcmQgdHlwZVxuICogICAgICBmdW5jdGlvbnM6IHsgLy8gZnVuY3Rpb24ga2V5IGxvY2F0aW9uXG4gKiAgICAgICAgICBzaHVmZmxlOiAwLFxuICogICAgICAgICAgbGFuZ3VhZ2U6IDIsXG4gKiAgICAgICAgICBjYXBzOiAzLFxuICogICAgICAgICAgc3ltYm9sOiA0LFxuICogICAgICAgICAgcmVtb3ZlOiA1LFxuICogICAgICAgICAgY2xlYXI6IDksXG4gKiAgICAgICAgICBzcGFjZTogMTAsXG4gKiAgICAgICAgICBjbG9zZTogMTEsXG4gKiAgICAgICAgICBkb25lOiAyMFxuICogICAgICB9LFxuICogICAgICBrZXlzOiBbXCI5XCIsIFwiM1wiLCBcIjVcIiwgXCIxXCIsIFwiXCIsIFwiN1wiLCBcIjBcIiwgXCIyXCIsIFwiNFwiLCBcIjZcIiwgXCI4XCIsIFwiXCJdLCAvLyBhbGwga2V5cyBidXQgZnVuY3Rpb24ga2V5cy5cbiAqICAgICAgdGVtcGxhdGU6IHsgLy8gaHRtbCB0ZW1wbGF0ZXQgZm9yIGtleSBlbGVtZW50c1xuICogICAgICAgICAga2V5OiAnPGxpIGNsYXNzPVwic3ViY29uXCI+PHNwYW4gY2xhc3M9XCJidG5fa2V5XCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCI+e0tFWX08L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgYmxhbms6ICc8bGkgY2xhc3M9XCJzdWJjb25cIj48c3BhbiBjbGFzcz1cImJ0bl9rZXlcIj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgc2h1ZmZsZTogJzxsaSBjbGFzcz1cInN1YmNvblwiPjxzcGFuIGNsYXNzPVwiYnRuIGJ0bl9yZWxvYWRcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cInNodWZmbGVcIj7snqzrsLDsl7Q8L2J1dHRvbj48L3NwYW4+PC9saT4nLFxuICogICAgICAgICAgcmVtb3ZlOiAnPGxpIGNsYXNzPVwic3ViY29uIGxhc3RcIj48c3BhbiBjbGFzcz1cImJ0biBidG5fZGVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJyZW1vdmVcIj48c3BhbiBjbGFzcz1cInNwXCI+7IKt7KCcPC9zcGFuPjwvYnV0dG9uPjwvc3Bhbj48L2xpPidcbiAqICAgICAgfSxcbiAqICAgICAgY2FsbGJhY2s6IHsgLy8gY2FsbGJhY2sgZm9yIGZ1bmN0aW9uIG9yIG5vcm1hbCBrZXlzXG4gKiAgICAgICAgICBrZXk6IGZ1bmN0aW9uKCkgeyAvL3J1biB9LCAgICAgICAgICAvLyBBIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gdXNlciB0eXBlIG9yIHRvdWNoIGtleSAoYnV0IGZ1bmN0aW9uIGtleSlcbiAqICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7IC8vcnVuIH0sXG4gKiAgICAgICAgICBnZXRLZXlzOiBmdW5jdGlvbigpIHsgLy9ydW4gfSAgICAgICAgLy8gQSBjYWxsYmFjayB0aGF0IGNhbGxlZCAgcmVhcnJhbmdlIGtleXNcbiAqICAgICAgfSxcbiAqICAgICAgaXNDbGlja09ubHk6IGZhbHNlXG4gKiB9KTtcbiAqL1xudmFyIFZpcnR1YWxLZXlib2FyZCA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgVmlydHVhbEtleWJvYXJkLnByb3RvdHlwZSAqL3tcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGh0bWwgdGVtcGxhdGUgZm9yIGtleXNcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3RlbXBsYXRlOiB7XG4gICAgICAgIGtleTogJzxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIntLRVl9XCI+e0tFWX08L2J1dHRvbj48L2xpPicsXG4gICAgICAgIGJsYW5rOiAnPGxpPjwvbGk+J1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBIG1hcCBkYXRhIGZvciBmaXhlZCBrZXlzKGZ1bmN0aW9uIGtleXMpXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9maXhlZEtleXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQSBhcnJheSBmb3IgdW5maXhlZCBrZXlzJyBvcmRlci5cbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmF3S2V5czogW10sXG5cbiAgICAvKipcbiAgICAgKiBBIGFycmF5IGZvciBibGFuayBrZXlzJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmaWVkUmF3S2V5czogW10sXG5cbiAgICAvKioqIFxuICAgICAqIFRoZSBtYXAgZGF0YSBmb3IgdmVydHVhbCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfa2V5TWFwOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEEgYXJyYXkgb2YgYWxsIG9mIGtleXMoZml4ZWQsIHVuZml4ZWQpJyBvcmRlclxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9rZXlTZXF1ZW5jZXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQSBtYXAgZm9yIGNhbGxiYWNrIHN1cHBvc2VkIHRvIHJ1biBmb3Iga2V5c1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY2FsbGJhY2s6IHt9LFxuXG4gICAgLyoqXG4gICAgICogS2V5IHR5cGUgb2YgY3VycmVudCBrZXlib2FyZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3VycmVudEtleVR5cGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGVuZ2xpc2gga2V5Ym9hcmQgb3Igbm90XG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaXNFbmdsaXNoOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgc3ltYm9sIGxldHRlciBrZXlib2FyZCBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc1N5bWJvbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiB3aGV0aGVyIGNhcHMgbG9jayBvciBub3RcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pc0NhcHNMb2NrOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudEZyYWdtZW50IGlucHJvbXR1IHBvb2wgZm9yIHNhdmluZyBrZXkgZWxlbWVudFxuICAgICAqIEB0eXBlIHtlbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RvY3VtZW50RnJhZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0YWxpemUgXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyB0byBpbml0aWFsaXplIGNvbXBvbmVudFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5faW5pdFZhcmlhYmxlcyhvcHRpb25zIHx8IHt9KTtcblxuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5U2VxdWVuY2UoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lS2V5TWFwKCk7XG4gICAgICAgIHRoaXMuX2luaXRLZXlib2FyZChvcHRpb25zLmNvbnRhaW5lcik7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRXZlbnQob3B0aW9ucy5pc0NsaWNrT25seSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJpdmF0ZSBmaWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBPcHRpb25zIHRvIGluaXRpYWxpemUga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0VmFyaWFibGVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gb3B0aW9ucy5rZXlUeXBlIHx8ICdlbmdsaXNoJztcbiAgICAgICAgdGhpcy5fZml4ZWRLZXlzID0gb3B0aW9ucy5mdW5jdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3Jhd0tleXMgPSB0aGlzLl9jb3B5QXJyYXkob3B0aW9ucy5rZXlzKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGUgPSB0dWkudXRpbC5leHRlbmQodGhpcy5fdGVtcGxhdGUsIG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2sgfHwge307XG4gICAgICAgIHRoaXMuX2RvY3VtZW50RnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmRzIGV2ZW50XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NsaWNrT25seSBBIG9wdGlvbiB0byBkZWNpZGUgdG8gaWdub3JlIHRvdWNoZXZlbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oaXNDbGlja09ubHkpIHtcbiAgICAgICAgdmFyIGlzU3VwcG9ydFRvdWNoID0gIWlzQ2xpY2tPbmx5ICYmICgoJ2NyZWF0ZVRvdWNoJyBpbiBkb2N1bWVudCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50KSk7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBpc1N1cHBvcnRUb3VjaCA/ICd0b3VjaHN0YXJ0JyA6ICdjbGljayc7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIub24oZXZlbnRUeXBlLCAkLnByb3h5KHRoaXMuX3ByZXNzS2V5SGFuZGxlciwgdGhpcykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVyIGZvciBjbGljayBvciB0b3VjaCBidXR0b25zXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IEEgZXZlbnQgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcHJlc3NLZXlIYW5kbGVyOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0QnV0dG9uID0gdGhpcy5fZ2V0VGFyZ2V0QnV0dG9uKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIHZhciBrZXlOYW1lLCBrZXlHcm91cCwgaW5kZXg7XG5cbiAgICAgICAgICBpZighdHVpLnV0aWwuaXNFeGlzdHkodGFyZ2V0QnV0dG9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5TmFtZSA9IHRhcmdldEJ1dHRvbi52YWx1ZTtcbiAgICAgICAga2V5R3JvdXAgPSB0aGlzLl9rZXlNYXBba2V5TmFtZV0ua2V5R3JvdXA7XG4gICAgICAgIGluZGV4ID0gdGhpcy5fa2V5TWFwW2tleU5hbWVdLnJhd0luZGV4O1xuXG4gICAgICAgIGlmKGtleUdyb3VwID09PSAna2V5Jykge1xuICAgICAgICAgICAgdGhpcy5fZXhlY3V0ZUNhbGxiYWNrKGtleUdyb3VwLCBpbmRleCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzW2tleU5hbWVdKCk7XG4gICAgICAgICAgICB0aGlzLl9leGVjdXRlQ2FsbGJhY2soa2V5TmFtZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjbGlja2VkL3RvdWNoZWQgZWxlbWVudHMgb2Yga2V5c1xuICAgICAqIEBwYXJhbSB7ZWxlbWVudH0gdGFyZ2V0RWxlbWVudCBBIGNsaWNrZWQvdG91Y2hlZCBodG1sIGVsZW1lbnRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRUYXJnZXRCdXR0b246IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgaWYodGFyZ2V0RWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdCVVRUT04nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRhcmdldEVsZW1lbnQpLnBhcmVudCgnYnV0dG9uJylbMF07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGtleXMgYXJyYXkgZm9yIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hcnJhbmdlS2V5U2VxdWVuY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc29ydGVkS2V5cztcblxuICAgICAgICAvLyBTb3J0IGZpeGVkIGtleXMgYnkgaW5kZXhcbiAgICAgICAgc29ydGVkS2V5cyA9IHRoaXMuX3NvcnRGaXhlZEtleXMoKTtcblxuICAgICAgICAvLyBDb3B5IHJlY2lldmVkIGtleSBhcnJheVxuICAgICAgICB0aGlzLl9pZGVudGlmeVJhd0tleXMoKTtcbiAgICAgICAgdGhpcy5fY29weUFycmF5KHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzLCB0aGlzLl9rZXlTZXF1ZW5jZXMpO1xuXG4gICAgICAgIC8vIEluc2VydCBmaXhlZCBrZXkgXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2goc29ydGVkS2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMuc3BsaWNlKHRoaXMuX2ZpeGVkS2V5c1t2YWx1ZV0sIDAsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluamVjdCBrZXkgdmFsdWUgdG8gZmluZCBibGFuayBrZXlcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pZGVudGlmeVJhd0tleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYmxhbmtDb3VudCA9IDA7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fcmF3S2V5cywgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZih0aGlzLl9nZXRLZXlHcm91cCh2YWx1ZSkgPT09ICdibGFuaycpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICdibGFuaycgKyBibGFua0NvdW50O1xuICAgICAgICAgICAgICAgIGJsYW5rQ291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2lkZW50aWZpZWRSYXdLZXlzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhcnJheSAobm90IGRlZXAgY29weSlcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBvcmlnaW5hbEFycmF5IE9yaWdpbmFsIGFycmF5XG4gICAgICogQHBhcmFtIHthcnJheX0gW2NvcHlBcnJheV0gTmV3IGFycmF5XG4gICAgICogQHJldHVybnMgeyp9IFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NvcHlBcnJheTogZnVuY3Rpb24ob3JpZ2luYWxBcnJheSwgY29weUFycmF5KSB7XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eShvcmlnaW5hbEFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0FycmF5KG9yaWdpbmFsQXJyYXkpKSB7XG4gICAgICAgICAgICBvcmlnaW5hbEFycmF5ID0gW29yaWdpbmFsQXJyYXldO1xuICAgICAgICB9XG4gICAgICAgIGlmKCF0dWkudXRpbC5pc0V4aXN0eShjb3B5QXJyYXkpIHx8ICF0dWkudXRpbC5pc0FycmF5KGNvcHlBcnJheSkpIHtcbiAgICAgICAgICAgIGNvcHlBcnJheSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChvcmlnaW5hbEFycmF5LCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGNvcHlBcnJheVtpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgcmV0dXJuIGNvcHlBcnJheTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU29ydCBmaXhlZCBrZXlzLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gRml4ZWQga2V5cycgYXJyYXkgdGhhdCBpcyBzb3J0ZWQgYnkgaW5kZXhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zb3J0Rml4ZWRLZXlzIDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzb3J0ZWRLZXlzO1xuICAgICAgICB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoID0gMDtcblxuICAgICAgICBzb3J0ZWRLZXlzID0gdHVpLnV0aWwua2V5cyh0aGlzLl9maXhlZEtleXMpIHx8IFtdO1xuICAgICAgICBzb3J0ZWRLZXlzLnNvcnQoJC5wcm94eShmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZml4ZWRLZXlzW2FdIC0gdGhpcy5fZml4ZWRLZXlzW2JdO1xuICAgICAgICB9LCB0aGlzKSk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZEtleXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBtYXAgZGF0YSBieSBrZXkgaW5mb3JtYXRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWZpbmVLZXlNYXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9yZWZpbmVGaXhlZEtleXMoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lRmxvYXRpbmdLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZGVmaW5lIGZpeGVkIGtleXMgbWFwXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVmaW5lRml4ZWRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaCh0aGlzLl9maXhlZEtleXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIHRoaXMuX2tleU1hcFtrZXldID0ge1xuICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgIHJhd0luZGV4OiBudWxsLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uSW5kZXg6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cChrZXkpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVkZWZpbmUgdW5maXhlZCBrZXlzIG1hcFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlZmluZUZsb2F0aW5nS2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5faWRlbnRpZmllZFJhd0tleXMsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fa2V5TWFwW3ZhbHVlXSkpIHtcbiAgICAgICAgICAgICAgICAvLyB2MS4wLjA6OiBFeGlzdCBjYXNlLCBvbmx5IGNoYW5nZSBwb3NpdGlvbkluZGV4XG4gICAgICAgICAgICAgICAgdGhpcy5fa2V5TWFwW3ZhbHVlXS5wb3NpdGlvbkluZGV4ID0gdGhpcy5fZ2V0UG9zaXRpb25JbmRleCh2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyB2MS4xLjA6OiBFeGlzdCBjYXNlLCBjaGFuZ2UgcG9zaXRpb25JbmRleCB3aXRoICoqcmF3SW5kZXgqKlxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0ucmF3SW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBtYXAgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMuX2tleU1hcFt2YWx1ZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHJhd0luZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25JbmRleDogdGhpcy5fZ2V0UG9zaXRpb25JbmRleCh2YWx1ZSksXG4gICAgICAgICAgICAgICAgICAgIGtleUdyb3VwOiB0aGlzLl9nZXRLZXlHcm91cCh0aGlzLl9yYXdLZXlzW2luZGV4XSlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGtleSB0eXBlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXkgdmFsdWUgXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSBrZXkgdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldEtleUdyb3VwOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleUdyb3VwO1xuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9maXhlZEtleXNba2V5XSkpIHtcbiAgICAgICAgICAgIGtleUdyb3VwID0gJ2Z1bmN0aW9uJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKGtleSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBrZXlHcm91cCA9ICdibGFuayc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUdyb3VwID0gJ2tleSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleUdyb3VwO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm4gaW5kZXgga2V5cyBpbiB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB2YWx1ZSBcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBBIGtleSBpbmRleFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFBvc2l0aW9uSW5kZXg6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgICBsZW5ndGggPSB0aGlzLl9rZXlTZXF1ZW5jZXMubGVuZ3RoO1xuXG4gICAgICAgIGZvcig7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYoa2V5ID09PSB0aGlzLl9rZXlTZXF1ZW5jZXNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFZpcnR1YWxLZXlib2FyZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVySWQgQSBjb250YWluZXIgaWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9pbml0S2V5Ym9hcmQ6IGZ1bmN0aW9uKGNvbnRhaW5lcklkKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoY29udGFpbmVySWQpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvbnRhaW5lclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJJZCBBIGNvbnRhaW5lciBpZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXRDb250YWluZXI6IGZ1bmN0aW9uKGNvbnRhaW5lcklkKSB7XG4gICAgICAgIGlmKHRoaXMuXyRjb250YWluZXIpIHtcbiAgICAgICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5faWRlbnRpZmllZFJhd0tleXMsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZG9jdW1lbnRGcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyID0gJCgnIycgKyBjb250YWluZXJJZCk7XG4gICAgICAgICAgICBpZighdHVpLnV0aWwuaXNIVE1MVGFnKHRoaXMuXyRjb250YWluZXJbMF0pKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fJGNvbnRhaW5lciA9IHRoaXMuX2NyZWF0ZUNvbnRhaW5lcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBWaXJ0dWFsS2V5Ym9hcmQgY29udGFpbmVyXG4gICAgICogQHJldHVybnMge2VsZW1lbnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlQ29udGFpbmVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lcklkID0gJ3ZrLScgKyB0aGlzLl9nZXRUaW1lKCksXG4gICAgICAgICAgICBjb250YWluZXIgPSAkKCc8dWwgaWQ9JyArIGNvbnRhaW5lcklkICsgJz4nKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hcHBlbmQoY29udGFpbmVyKTtcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGN1cnJlbnQgdGltZVxuICAgICAqIEByZXR1cm5zIHttaWxsaXNlY29uZH0gRGF0ZSB0aW1lIGJ5IG1pbGxpc2Vjb25kXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VGltZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0aW1lU3RhbXA7XG4gICAgICAgIGlmKERhdGUubm93KSB7XG4gICAgICAgICAgICB0aW1lU3RhbXAgPSBEYXRlLm5vdygpIHx8IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aW1lU3RhbXA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFycmFuZ2Uga2V5cyBpbiB2aXJ0dWFsIGtleWJvYXJkLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FycmFuZ2VLZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGtleUVsZW1lbnQ7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fa2V5U2VxdWVuY2VzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAga2V5RWxlbWVudCA9IHRoaXMuX2tleU1hcFt2YWx1ZV0uZWxlbWVudDtcbiAgICAgICAgICAgIGlmKCF0dWkudXRpbC5pc0hUTUxUYWcoa2V5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9rZXlNYXBbdmFsdWVdLmVsZW1lbnQgPSBrZXlFbGVtZW50ID0gdGhpcy5fY3JlYXRlS2V5RWxlbWVudCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl8kY29udGFpbmVyLmFwcGVuZChrZXlFbGVtZW50KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0ZW1wbGF0ZSBieSBrZXkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleUdyb3VwIEEga2V5IHR5cGUgdG8gY3JlYXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSB0byBjcmVhdGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFRlbXBsYXRlOiBmdW5jdGlvbihrZXlHcm91cCwga2V5KSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZTtcblxuICAgICAgICBpZihrZXlHcm91cCA9PT0gJ2JsYW5rJykge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZS5ibGFuaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVba2V5XSB8fCB0aGlzLl90ZW1wbGF0ZS5rZXk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eShrZXkpKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRlbXBsYXRlLnJlcGxhY2UoL3tLRVl9L2csIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUga2V5IGJ1dHRvbiBhbmQgcmV0dXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQSBrZXlzIHRvIGNyZWF0ZVxuICAgICAqIEByZXR1cm5zIHtlbGVtZW50fSBBIGtleSBidXR0b24gZWxlbWVudFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZUtleUVsZW1lbnQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5R3JvdXAgPSB0aGlzLl9rZXlNYXBba2V5XS5rZXlHcm91cCxcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5fZ2V0VGVtcGxhdGUoa2V5R3JvdXAsIGtleSksXG4gICAgICAgICAgICBrZXlFbGVtZW50ID0gJCh0ZW1wbGF0ZSksXG4gICAgICAgICAgICBidXR0b25FbGVtZW50ID0ga2V5RWxlbWVudC5maW5kKCdidXR0b24nKTtcblxuICAgICAgICBpZighYnV0dG9uRWxlbWVudC52YWwoKSAmJiB0dWkudXRpbC5pc0V4aXN0eShrZXkpKSB7XG4gICAgICAgICAgICBidXR0b25FbGVtZW50LnZhbChrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlFbGVtZW50WzBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaHVmZmxlIHRoZSBrZXlzXG4gICAgICogQHBhcmFtIHthcnJheX0gcmF3S2V5cyBBIGtleXMgdGhhdCBpcyBzaHVmZmxlZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlQXJyYW5nZUtleXM6IGZ1bmN0aW9uKHJhd0tleXMpIHtcbiAgICAgICAgLy8gSW5pdGFpbGl6ZSBleGlzdCBrZXlzXG4gICAgICAgIHRoaXMuX3Jhd0tleXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgdGhpcy5fY29weUFycmF5KHJhd0tleXMsIHRoaXMuX3Jhd0tleXMpO1xuICAgICAgICB0aGlzLl9hcnJhbmdlS2V5U2VxdWVuY2UoKTtcbiAgICAgICAgdGhpcy5fcmVmaW5lRmxvYXRpbmdLZXlzKCk7XG4gICAgICAgIHRoaXMuX2FycmFuZ2VLZXlzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJ1biBjdXN0b20gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tLZXkgVGhlIGtleXMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtyYXdJbmRleF0gVGhlIHR5cGVkIGluZGV4IG51bWJlcmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9leGVjdXRlQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrS2V5LCByYXdJbmRleCkge1xuICAgICAgICBpZih0dWkudXRpbC5pc0V4aXN0eSh0aGlzLl9jYWxsYmFjaywgY2FsbGJhY2tLZXkpICYmIHR1aS51dGlsLmlzRnVuY3Rpb24odGhpcy5fY2FsbGJhY2tbY2FsbGJhY2tLZXldKSkge1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tbY2FsbGJhY2tLZXldKHJhd0luZGV4KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQga2V5Ym9hcmQgYXJyYXlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2FzZVRvZ2dsZSBXaGV0aGVyIGNoYW5nZSBjYXNlIG9yIG5vdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldFJhd0tleXM6IGZ1bmN0aW9uKGlzQ2FzZVRvZ2dsZSkge1xuICAgICAgICB2YXIgcmF3S2V5cztcbiAgICAgICAgaWYodHVpLnV0aWwuaXNFeGlzdHkodGhpcy5fY2FsbGJhY2ssICdnZXRLZXlzJykgJiYgdHVpLnV0aWwuaXNGdW5jdGlvbih0aGlzLl9jYWxsYmFjay5nZXRLZXlzKSkge1xuICAgICAgICAgICAgaWYoaXNDYXNlVG9nZ2xlKSB7XG4gICAgICAgICAgICAgICAgLy8gTm90IHNodWZmbGVkLCBvbmx5IGdldCBvdGhlciBjYXNlIGFycmF5LlxuICAgICAgICAgICAgICAgIHJhd0tleXMgPSB0aGlzLl9jYWxsYmFjay5nZXRLZXlzKHRoaXMuX2N1cnJlbnRLZXlUeXBlLCB0aGlzLl9pc0NhcHNMb2NrLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IG5ldyBrZXlzIGluZm9ybWF0aW9uIGFycmF5XG4gICAgICAgICAgICAgICAgcmF3S2V5cyA9IHRoaXMuX2NhbGxiYWNrLmdldEtleXModGhpcy5fY3VycmVudEtleVR5cGUsIHRoaXMuX2lzQ2Fwc0xvY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmKHR1aS51dGlsLmlzQXJyYXkocmF3S2V5cykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlQXJyYW5nZUtleXMocmF3S2V5cyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZSBrZXlzLlxuICAgICAqIEBhcGlcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICB2aXJ0dWFsS2V5Ym9hcmQuc2h1ZmZsZSgpO1xuICAgICAqL1xuICAgIHNodWZmbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZXNldCBleGlzdCB2YWx1ZXNcbiAgICAgICAgdGhpcy5fa2V5U2VxdWVuY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgRW5nL0tvci5cbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLmxhbmd1YWdlKCk7XG4gICAgICovXG4gICAgbGFuZ3VhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzRW5nbGlzaCA9ICF0aGlzLl9pc0VuZ2xpc2g7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRLZXlUeXBlID0gdGhpcy5faXNFbmdsaXNoID8gJ2VuZ2xpc2gnIDogJ2tvcmVhbic7XG4gICAgICAgIHRoaXMuX2dldFJhd0tleXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIHVwcGVyL2xvd2VyIGNhc2UuXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5jYXBzKCk7XG4gICAgICovXG4gICAgY2FwczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2luaXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5faXNDYXBzTG9jayA9ICF0aGlzLl9pc0NhcHNMb2NrO1xuICAgICAgICB0aGlzLl9nZXRSYXdLZXlzKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2Ugc3ltYm9sL251bWJlciBrZXlzXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5zeW1ib2woKTtcbiAgICAgKi9cbiAgICBzeW1ib2w6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pbml0Q29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuX2lzU3ltYm9sID0gIXRoaXMuX2lzU3ltYm9sO1xuICAgICAgICB0aGlzLl9jdXJyZW50S2V5VHlwZSA9IHRoaXMuX2lzU3ltYm9sID8gJ3N5bWJvbCcgOiAnbnVtYmVyJztcbiAgICAgICAgdGhpcy5fZ2V0UmF3S2V5cygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGxhc3QgdHlwZWQvdG91Y2hlZCB2YWx1ZVxuICAgICAqL1xuICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGFsbCB0eXBlZCBrZXlzLlxuICAgICAqL1xuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IGJsYW5rXG4gICAgICovXG4gICAgc3BhY2U6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBPcGVuIHZpcnR1YWwga2V5Ym9hcmRcbiAgICAgKiBAYXBpXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgdmlydHVhbEtleWJvYXJkLm9wZW4oKTtcbiAgICAgKi9cbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zaHVmZmxlKCk7XG4gICAgICAgIHRoaXMuXyRjb250YWluZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbG9zZSB2aXJ0dWFsIGtleWJvYXJkXG4gICAgICogQGFwaVxuICAgICAqIEBleGFtcGxlXG4gICAgICogIHZpcnR1YWxLZXlib2FyZC5jbG9zZSgpO1xuICAgICAqL1xuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICB0aGlzLl8kY29udGFpbmVyLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgdmllcnR1YWwga2V5Ym9hcmQgd2l0aCBjb21wbGF0ZSBidXR0b24uXG4gICAgICovXG4gICAgZG9uZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsS2V5Ym9hcmQ7XG4iXX0=
