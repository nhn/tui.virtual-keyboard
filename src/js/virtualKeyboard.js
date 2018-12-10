/**
 * @fileoverview The module that capture keys typed from user.
 * @author NHN Ent. FE dev team. <dl_javascript@nhnent.com>
 */

'use strict';

var $ = require('jquery');
var snippet = require('tui-code-snippet');

/**
 * A virtual keyboard component is capturing kyes that is typed from user.
 * @class VirtualKeyboard
 * @param {jQuery|Element|string} container - Wrapper element or id selector
 * @param {object} options
 *     @param {string} options.keyType - Type of keyboard
 *     @param {array} options.keys - Index of normal keys
 *     @param {object} options.functions - Index of function keys
 *     @param {object} options.template - Template set for all keys
 *     @param {object} options.callback - Callback set for all keys
 *     @param {boolean} options.isClickOnly - Whether the touch event is ignored or not
 *     @param {Boolean} [options.usageStatistics=true|false] send hostname to google analytics [default value is true]
 * @example
 * var container = document.getElementById('virtual-keyboard');
 * var VirtualKeyboard = tui.VirtualKeyboard; // or require('tui-virtual-keyboard');
 * var instance = new VirtualKeyboard(container, {
 *      keyType: 'number',
 *      keys: ['9', '3', '5', '1', '', '7', '0', '2', '4', '6', '8', ''],
 *      functions: {
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
 *      template: {
 *          key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
 *          blank: '<li class="subcon"><span class="btn_key"></span></li>',
 *          shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button" value="shuffle">재배열</button></span></li>',
 *          remove: '<li class="subcon last"><span class="btn btn_del"><button type="button" value="remove"><span class="sp">삭제</span></button></span></li>'
 *      },
 *      callback: {
 *          key: function() {
 *          },
 *          getKeys: function() {
 *          },
 *          remove: function() {
 *          }
 *      },
 *      isClickOnly: false
 * });
 */
var VirtualKeyboard = snippet.defineClass(/** @lends VirtualKeyboard.prototype */{
    init: function(container, options) {
        options = snippet.extend({
            usageStatistics: true
        }, options);

        this._initVariables(options || {});

        this._arrangeKeySequence();
        this._refineKeyMap();
        this._initKeyboard(container);

        this._attachEvent(options.isClickOnly);

        if (options.usageStatistics) {
            snippet.sendHostname('virtual-keyboard', 'UA-129987462-1');
        }
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
        this._template = snippet.extend(this._template, options.template);
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

        if (!snippet.isExisty(targetButton)) {
            return;
        }

        keyName = targetButton.value;
        keyGroup = this._getKeyGroup(keyName);
        index = this._keyMap[keyName].rawIndex;

        if (keyGroup === 'key') {
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
        var result;

        if (targetElement.tagName.toUpperCase() === 'BUTTON') {
            result = targetElement;
        } else {
            result = $(targetElement).parent('button')[0];
        }

        return result;
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
        snippet.forEach(sortedKeys, function(value) {
            if (snippet.isExisty(value)) {
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

        snippet.forEach(this._rawKeys, function(value, index) {
            if (this._getKeyGroup(value) === 'blank') {
                value = 'blank' + blankCount;
                blankCount += 1;
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
        if (!snippet.isExisty(originalArray)) {
            return false;
        }
        if (!snippet.isArray(originalArray)) {
            originalArray = [originalArray];
        }
        if (!snippet.isExisty(copyArray) || !snippet.isArray(copyArray)) {
            copyArray = [];
        }

        snippet.forEach(originalArray, function(value, index) {
            copyArray[index] = value;
        }, this);

        return copyArray;
    },

    /**
     * Sort fixed keys.
     * @returns {Array} Fixed keys' array that is sorted by index
     * @private
     */
    _sortFixedKeys: function() {
        var sortedKeys;

        this._keySequences.length = 0;

        sortedKeys = snippet.keys(this._fixedKeys) || [];
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
        snippet.forEach(this._fixedKeys, function(value, key) {
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
        snippet.forEach(this._identifiedRawKeys, function(value, index) {
            if (snippet.isExisty(this._keyMap[value])) {
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

        if (snippet.isExisty(this._fixedKeys[key])) {
            keyGroup = 'function';
        } else {
            keyGroup = (key === '') ? 'blank' : 'key';
        }

        return keyGroup;
    },

    /**
     * Return index keys in virtual keyboard
     * @param {string} key A key value
     * @returns {number} A key index
     * @private
     */
    _getPositionIndex: function(key) {
        var i = 0;
        var length = this._keySequences.length;
        var result;

        for (; i < length; i += 1) {
            if (key === this._keySequences[i]) {
                result = i;
                break;
            }
        }

        return result;
    },

    /**
     * Initialize VirtualKeyboard
     * @param {jQuery|Element|string} container - Wrapper element or id selector
     * @private
     */
    _initKeyboard: function(container) {
        this._initContainer(container);
        this._arrangeKeys();
    },

    /**
     * Initialize container
     * @param {jQuery|Element|string} container - Wrapper element or id selector
     * @private
     */
    _initContainer: function(container) {
        if (this._$container) {
            snippet.forEach(this._identifiedRawKeys, function(value) {
                this._documentFragment.appendChild(this._keyMap[value].element);
            }, this);
        } else {
            if (snippet.isString(container)) {
                this._$container = $('#' + container);
            } else {
                this._$container = $(container);
            }

            if (!snippet.isHTMLTag(this._$container[0])) {
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
        var containerId = 'vk-' + this._getTime();
        var container = $('<ul id=' + containerId + '>');

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

        if (Date.now) {
            timeStamp = Date.now() || new Date().getTime();
        }

        return timeStamp;
    },

    /**
     * Arrange keys in virtual keyboard
     * @private
     */
    _arrangeKeys: function() {
        var keyElement;

        snippet.forEach(this._keySequences, function(value) {
            keyElement = this._keyMap[value].element;
            if (!snippet.isHTMLTag(keyElement)) {
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

        if (keyGroup === 'blank') {
            template = this._template.blank;
        } else {
            template = this._template[key] || this._template.key;
        }

        if (snippet.isExisty(key)) {
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
        var keyGroup = this._keyMap[key].keyGroup;
        var template = this._getTemplate(keyGroup, key);
        var keyElement = $(template);
        var buttonElement = keyElement.find('button');

        if (!buttonElement.val() && snippet.isExisty(key)) {
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
        if (snippet.isExisty(this._callback, callbackKey) && snippet.isFunction(this._callback[callbackKey])) {
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

        if (snippet.isExisty(this._callback, 'getKeys') && snippet.isFunction(this._callback.getKeys)) {
            if (isCaseToggle) {
                // Not shuffled, only get other case array.
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock, true);
            } else {
                // Get new keys information array
                rawKeys = this._callback.getKeys(this._currentKeyType, this._isCapsLock);
            }
        }

        if (snippet.isArray(rawKeys)) {
            this._reArrangeKeys(rawKeys);
        }
    },

    /**
     * Shuffle keys.
     * @example
     * instance.shuffle();
     */
    shuffle: function() {
        // Reset exist values
        this._keySequences.length = 0;
        this._initContainer();
        this._getRawKeys();
    },

    /**
     * Toggle Eng/Kor
     * @example
     * instance.language();
     */
    language: function() {
        this._initContainer();
        this._isEnglish = !this._isEnglish;
        this._currentKeyType = this._isEnglish ? 'english' : 'korean';
        this._getRawKeys();
    },

    /**
     * Change upper/lower case
     * @example
     * instance.caps();
     */
    caps: function() {
        this._initContainer();
        this._isCapsLock = !this._isCapsLock;
        this._getRawKeys(true);
    },

    /**
     * Change symbol/number keys
     * @example
     * instance.symbol();
     */
    symbol: function() {
        this._initContainer();
        this._isSymbol = !this._isSymbol;
        this._currentKeyType = this._isSymbol ? 'symbol' : 'number';
        this._getRawKeys();
    },

    /**
     * Remove the last typed/touched value
     * @ignore
     */
    remove: function() {
    },

    /**
     * Reset all typed keys
     * @ignore
     */
    clear: function() {
    },

    /**
     * Insert blank
     * @ignore
     */
    space: function() {
    },

    /**
     * Open virtual keyboard
     * @example
     * instance.open();
     */
    open: function() {
        this.shuffle();
        this._$container.show();
    },

    /**
     * Close virtual keyboard
     * @example
     * instance.close();
     */
    close: function() {
        this.clear();
        this._$container.hide();
    },

    /**
     * Close virtual keyboard with complete button
     * @ignore
     */
    done: function() {
        this.close();
    }
});

module.exports = VirtualKeyboard;
