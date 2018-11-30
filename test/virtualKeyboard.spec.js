'use strict';

var $ = require('jquery');
var snippet = require('tui-code-snippet');

var VirtualKeyboard = require('../src/js/virtualKeyboard');

describe('VirtualKeyboard', function() {
    var keys, vk, vk2, options, options2;

    jasmine.getFixtures().fixturesPath = 'base/';

    keys = {
        english: ['a', 'b', 'c', 'd', '', 'e', 'f', 'g', 'h', 'i', 'j', ''],
        korean: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', '', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', ''],
        symbol: ['!', '@', '#', '$', '', '%', '^', '&', '*', '(', ')', ''],
        number: ['9', '3', '5', '1', '', '7', '0', '2', '4', '6', '8', '']
    };

    beforeEach(function() {
        loadFixtures('test/fixtures/key.html');
        loadFixtures('test/fixtures/target.html');

        options = {
            keyType: 'number',
            functions: {
                shuffle: 0,
                language: 2,
                caps: 3,
                symbol: 4,
                remove: 5,
                clear: 9,
                space: 10,
                close: 11,
                done: 20
            },
            keys: keys.number,
            template: {
                key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
                blank: '<li class="subcon"><span class="btn_key"></span></li>',
                shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button">shuffle</button></span></li>',
                remove: '<li class="subcon last"><span class="btn btn_del"><button type="button"><span class="sp">remove</span></button></span></li>'
            },
            callback: {
                key: function() {
                },
                remove: function() {
                },
                getKeys: function() {
                    return ['4', '6', '0', '2', '5', '8', '7', '', '3', '1', '9', ''];
                }
            }
        };
        options2 = {
            keyType: 'korean',
            functions: {
                shuffle: 0,
                language: 2,
                caps: 3,
                symbol: 4,
                remove: 5,
                clear: 9,
                space: 10,
                close: 11,
                done: 20
            },
            keys: keys.korean,
            template: {
                key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
                blank: '<li class="subcon"><span class="btn_key"></span></li>',
                shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button">shuffle</button></span></li>',
                remove: '<li class="subcon last"><span class="btn btn_del"><button type="button"><span class="sp">remove</span></button></span></li>'
            },
            callback: {
                key: function() {
                },
                remove: function() {
                },
                getKeys: function() {
                }
            }
        };

        vk = new VirtualKeyboard('vkeyboard', options);
        vk2 = new VirtualKeyboard('noId', options2);
    });

    describe('VirtualKeyboard defined', function() {
        it('Virtualkeyboard instance defined', function() {
            expect(vk).toBeDefined();
            expect(vk2).toBeDefined();
        });

        it('VirtualKeyboard container created', function() {
            expect(vk._$container).toBeDefined();
            expect(vk2._$container).toBeDefined();
        });
    });

    describe('_copyArray', function() {
        var res1,
            res2,
            res3,
            res4,
            res5;

        beforeEach(function() {
            res1 = vk._copyArray(['a', 'b', 'c'], ['1', '2', '3']);
            res2 = vk._copyArray(['1', '2', '3']);
            res3 = vk._copyArray('0');
            res4 = vk._copyArray(['q'], ['a', 'b', 'c']);
            res5 = vk._copyArray();
        });

        it('_copyArray(["a", "b", "c"], ["1", "2", "3"]) is return ["a", "b", "c"]', function() {
            expect(res1).toEqual(['a', 'b', 'c']);
        });
        it('_copyArray(["1", "2", "3"])is return ["1", "2", "3"]', function() {
            expect(res2).toEqual(['1', '2', '3']);
        });
        it('_copyArray("0") is return ["0"]', function() {
            expect(res3).toEqual(['0']);
        });
        it('_copyArray(["q"], ["a", "b", "c"]) is return ["q", "b", "c"]', function() {
            expect(res4).toEqual(['q', 'b', 'c']);
        });
        it('_copyArray() is return false', function() {
            expect(res5).toBeFalsy();
        });
    });

    describe('_getTargetButton', function() {
        var res1,
            res2,
            res3,
            ipt1,
            ipt2,
            ipt3;

        beforeEach(function() {
            var root = $('#btns');
            ipt1 = root.find('button');
            ipt2 = root.find('button span');
            ipt3 = root.find('.subcon');
            res1 = vk._getTargetButton(ipt1[0]);
            res2 = vk._getTargetButton(ipt2[0]);
            res3 = vk._getTargetButton(ipt3[0]);
        });

        it('input button, return button', function() {
            expect(res1).toBe(ipt1[0]);
        });

        it('input button\'s sub element, return button', function() {
            expect(res2).toBe(ipt2.parent('button')[0]);
        });

        it('input to do not belong to button element, return undefined', function() {
            expect(res3).not.toBeDefined();
        });
    });

    describe('_executeCallback', function() {
        beforeEach(function() {
            vk2._callback = {
                key: function() {
                },
                remove: function() {
                },
                getKeys: function() {
                }
            };

            spyOn(vk2._callback, 'key');
            spyOn(vk2._callback, 'remove');
            spyOn(vk2._callback, 'getKeys');

            vk2._executeCallback('key', 1);
            vk2._executeCallback('remove', 5);
            vk2._executeCallback('getKeys', 0);
        });

        it('key called', function() {
            expect(vk2._callback.key).toHaveBeenCalled();
            expect(vk2._callback.key).toHaveBeenCalledWith(1);
        });

        it('remove called', function() {
            expect(vk2._callback.remove).toHaveBeenCalled();
            expect(vk2._callback.remove).toHaveBeenCalledWith(5);
        });

        it('getKeys', function() {
            expect(vk2._callback.getKeys).toHaveBeenCalled();
            expect(vk2._callback.getKeys).toHaveBeenCalledWith(0);
        });
    });

    describe('_identifyRawKeys', function() {
        var numbers = ['4', '6', '0', '2', '5', '8', '7', '', '3', '1', '9', ''];
        var bfRaw, bfSeq, bfMap;

        /**
         * Get hash map
         * @returns {array} hash map
         */
        function getHashMap() {
            return snippet.map(vk._keyMap, function(element) {
                var obj = {};

                snippet.forEach(element, function(value, key) {
                    obj[key] = element[key];
                });

                return obj;
            });
        }

        beforeEach(function() {
            bfRaw = vk._copyArray(vk._rawKeys);
            bfSeq = vk._copyArray(vk._keySequences);
            bfMap = getHashMap();

            vk._reArrangeKeys(numbers);
        });

        it('rawKeys are recreated', function() {
            expect(bfRaw).not.toBe(vk._rawKeys);
            expect(bfRaw).not.toEqual(vk._rawKeys);
        });
        it('keySequences are recreated', function() {
            expect(bfSeq).not.toBe(vk._keySequences);
            expect(bfSeq).not.toEqual(vk._keySequences);
        });
        it('keyMap are changed', function() {
            expect(bfMap[0].positionIndex).not.toBe(vk._keyMap[0].positionIndex);
            expect(bfMap[5].positionIndex).not.toBe(vk._keyMap[5].positionIndex);
        });
    });

    describe('_getRawKeys', function() {
        var res1,
            res2;
        beforeEach(function() {
            vk2._callback = {
                key: function() {
                },
                remove: function() {
                },
                getKeys: function(key, caps, fix) {
                    var result;

                    if (fix) {
                        result = false;
                    } else {
                        result = ['1', '2', '3', '4', '5', '6', '7', '8'];
                    }

                    return result;
                }
            };

            res1 = vk2._copyArray(vk2._rawKeys);
            vk2._getRawKeys();

            res2 = vk2._copyArray(vk2._rawKeys);
            spyOn(vk2, '_reArrangeKeys');
            vk2._getRawKeys(true);
        });

        it('Process data with fixed flag (fixed false)', function() {
            expect(res1).not.toEqual(vk2._rawKeys);
        });
        it('Process data with fixed flag(fixed true)', function() {
            expect(res2).toEqual(vk2._rawKeys);
            expect(vk2._reArrangeKeys).not.toHaveBeenCalled();
        });
    });

    describe('_pressKeyHandler', function() {
        beforeEach(function() {
            /*
             shuffle: 0,
             language: 2,
             caps: 3,
             symbol: 4,
             remove: 5,
             clear: 9,
             space: 10,
             close: 11,
             done: 20
             */
            var span1 = vk._$container.find('.subcon').eq(2),
                button1 = vk._$container.find('button').eq(12),
                shuffle = vk._$container.find('li').eq(0).find('button'),
                language = vk._$container.find('li').eq(2).find('button'),
                caps = vk._$container.find('li').eq(3).find('button'),
                symbol = vk._$container.find('li').eq(4).find('button'),
                remove = vk._$container.find('li').eq(5).find('button'),
                clear = vk._$container.find('li').eq(9).find('button'),
                space = vk._$container.find('li').eq(10).find('button'),
                close = vk._$container.find('li').eq(11).find('button'),
                done = vk._$container.find('button').last();

            vk._callback = {
                key: function() {
                },
                remove: function() {
                },
                getKeys: function() {
                }
            };

            spyOn(vk._callback, 'key');
            spyOn(vk, 'shuffle');
            spyOn(vk, 'language');
            spyOn(vk, 'caps');
            spyOn(vk, 'symbol');
            spyOn(vk, 'remove');
            spyOn(vk, 'clear');
            spyOn(vk, 'space');
            spyOn(vk, 'close');
            spyOn(vk, 'done');

            vk._pressKeyHandler({
                target: span1[0]
            });

            vk._pressKeyHandler({
                target: button1[0]
            });

            vk._pressKeyHandler({
                target: shuffle[0]
            });

            vk._pressKeyHandler({
                target: language[0]
            });

            vk._pressKeyHandler({
                target: caps[0]
            });

            vk._pressKeyHandler({
                target: symbol[0]
            });

            vk._pressKeyHandler({
                target: remove[0]
            });

            vk._pressKeyHandler({
                target: clear[0]
            });

            vk._pressKeyHandler({
                target: space[0]
            });

            vk._pressKeyHandler({
                target: close[0]
            });

            vk._pressKeyHandler({
                target: done[0]
            });
        });

        it('number button click, callback-key called', function() {
            expect(vk._callback.key).toHaveBeenCalled();
        });

        it('language button click, language called', function() {
            expect(vk.language).toHaveBeenCalled();
        });

        it('language button click, shuffle called', function() {
            expect(vk.shuffle).toHaveBeenCalled();
        });

        it('caps button click, caps called', function() {
            expect(vk.caps).toHaveBeenCalled();
        });

        it('symbol button click, symbol called', function() {
            expect(vk.symbol).toHaveBeenCalled();
        });

        it('remove button click, remove called', function() {
            expect(vk.remove).toHaveBeenCalled();
        });

        it('clear button click, clear called', function() {
            expect(vk.clear).toHaveBeenCalled();
        });

        it('space button click, space called', function() {
            expect(vk.space).toHaveBeenCalled();
        });

        it('close button click, close called', function() {
            expect(vk.close).toHaveBeenCalled();
        });

        it('done button click, done called', function() {
            expect(vk.done).toHaveBeenCalled();
        });
    });

    describe('shuffle, language, caps, symbol', function() {
        var bfFirst;

        beforeEach(function() {
            /* eslint-disable complexity */
            var getKeysCallback = function(keyType, isCapsLock, isFixed) {
                var rawKeys, i, length, key;

                if (isFixed) {
                    rawKeys = keys[keyType];
                    length = rawKeys.length;

                    for (i = 0; i < length; i += 1) {
                        if (rawKeys[i]) {
                            /* eslint-disable max-depth */
                            if (keyType === 'english') {
                                key = isCapsLock ? rawKeys[i].toUpperCase() : rawKeys[i].toLowerCase();
                            } else if (keyType === 'korean') {
                                if (isCapsLock) {
                                    key = rawKeys[i].replace('ㄱ', 'ㄲ').replace('ㅂ', 'ㅃ').replace('ㅅ', 'ㅆ').replace('ㅈ', 'ㅉ');
                                } else {
                                    key = rawKeys[i].replace('ㄲ', 'ㄱ').replace('ㅃ', 'ㅂ').replace('ㅆ', 'ㅅ').replace('ㅉ', 'ㅈ');
                                }
                            } else {
                                key = rawKeys[i];
                            }
                            /* eslint-enable max-length */

                            keys[keyType][i] = rawKeys[i] = key;
                        }
                    }
                } else {
                    rawKeys = keys[keyType] || keys.number;
                    i = length = rawKeys.length;

                    for (; i > 0; i -= 1) {
                        key = rawKeys.splice(Math.floor(Math.random() * i), 1)[0];
                        key = isCapsLock ? key.toUpperCase() : key.toLowerCase();
                        keys[keyType][length - 1] = rawKeys[length - 1] = key;
                    }
                }

                return rawKeys;
            };
            /* eslint-enable complexity */

            vk._callback = {
                key: function() {
                },
                remove: function() {
                },
                getKeys: getKeysCallback
            };

            bfFirst = vk._$container.find('li').eq(0).find('button').text();
            vk.shuffle();
        });

        it('data shuffle, function keys fixed', function() {
            expect(bfFirst).toBe(bfFirst);
        });
    });
    describe('usageStatistics', function() {
        beforeEach(function() {
            spyOn(snippet, 'imagePing');
            this.virtualKeyboard = null;
        });
        it('should send hostname by default', function() {
            this.virtualKeyboard = new VirtualKeyboard('virtualkeyboard1', options);

            expect(snippet.imagePing).toHaveBeenCalled();
        });
        it('should not send hostname on usageStatistics option false', function() {
            options.usageStatistics = false;
            this.virtualKeyboard = new VirtualKeyboard('virtualkeyboard1', options);

            expect(snippet.imagePing).not.toHaveBeenCalled();
        });
    });
});
