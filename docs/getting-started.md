### Load required files
```html
...
<script type="text/javascript" src="jquery.js"></script>
<script type="text/javascript" src="tui-code-snippet.js"></script>
<script type="text/javascript" src="tui-virtual-keyboard.js"></script>
...
```

### Create Virtual Keyboard

* You can create virtual keyboard instance with options.

| Name | Feature |
|----|----|
| conatainer | A container element ID |
| keyType | A type of keyboard |
| functions | A index of function keys |
|     | - shuffle : A index for shuffle key |
|     | - language : A index for language change key |
|     | - caps : A index for caps lock key |
|     | - symbol : A index for symbol change key |
|     | - remove : A index for backspace key |
|     | - clear : A index for clear key |
|     | - space : A index for space bar key |
|     | - close : A index for close keyboard key |
|     | - done : A index for done of input key |
| keys | The all of keys that are used on virtual keyboard.(but functions) |
| template | A template set for function keys |
|     | - key : A template for each normal key |
|     | - blank : A template for blank key |
|     | - shuffle : A template for shuffle key |
|     | - remove : A template for remove key |
|     | - language : A template for change language |
|     | - caps : A template for caps lock key |
|     | - symbol : A template for symbol key |
|     | - remove : A template for backspace key |
|     | - clear : A template for reset key |
|     | - space : A template for space bar key |
|     | - close : A template for close keyboard key |
|     | - done : A template for input done key |
| callback | A callback set for function keys |
|     | - key : A callback that is called when all keys are changed. |
|     | - getKeys : A callback that is called when rearrange keys |
|     | And you can register callback for every function keys by each key's name. |
| isClickOnly | A option to ignore touch event in some environment |

```html
<ul id="vkeyboard" class="lst_sub lst_keypad">
</ul>
```

* After make html, you can create component like following code.

```javascript
// create
var vkeyboard = new tui.VirtualKeyboard(document.getElementById('vkeyboard'), {
     keyType: 'number', // Keyboard type
     functions: { // function key index
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
     keys: ["9", "3", "5", "1", "", "7", "0", "2", "4", "6", "8", ""], // keys
     template: { // key template
         key: '<li class="subcon"><span class="btn_key"><button type="button">{KEY}</button></span></li>',
         blank: '<li class="subcon"><span class="btn_key"></span></li>',
         shuffle: '<li class="subcon"><span class="btn btn_reload"><button type="button" value="shuffle">Shuffle</button></span></li>',
         remove: '<li class="subcon last"><span class="btn btn_del"><button type="button" value="remove"><span class="sp">Backspace</span></button></span></li>'
     },
     callback: {
         key: function() { //run },         
         remove: function() { //run },
         getKeys: function() { //run }      
     },
     isClickOnly: ture // A option to decide to ignore touch event.
});
```
* This code will create virtual numeric keyboard.

### Notice
* `getKey` have to return same size array.
* All of function keys that you use have to get index via functions options.
