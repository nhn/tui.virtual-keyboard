# VirtualKeyboard
User can use the virtual keyboard like real keyboard in browser

## Feature
* Support virtual keys to input letters by click or touch
* Support mobile, PC both.
* Change english/korean, number, symbol
* Shuffles the keys
* When the keys are clicked/touched, this component run the callback functions with index.
* When this component toggle or shuffle the keys this component run the callback functions

## Documentation
* **API** : [https://nhnent.github.io/tui.virtual-keyboard/latest](https://nhnent.github.io/tui.virtual-keyboard/latest)
* **Tutorial** : [https://github.com/nhnent/tui.virtual-keyboard/wiki](https://github.com/nhnent/tui.virtual-keyboard/wiki)
* **Example** :
[https://nhnent.github.io/tui.virtual-keyboard/latest/tutorial-example01-basic.html](https://nhnent.github.io/tui.virtual-keyboard/latest/tutorial-example01-basic.html)

## Dependency
* [jquery](https://jquery.com/) >= 1.11.0
* [tui-code-snippet](https://github.com/nhnent/tui.code-snippet) >=1.2.5

## Test Environment
### PC
* IE8~11
* Edge
* Chrome
* Firefox
* Safari

### Mobile
* iOS 10.3.x
* Android 5.5.x

## Usage
### Use `npm`

Install the latest version using `npm` command:

```
$ npm install tui-virtual-keyboard --save
```

or want to install the each version:

```
$ npm install tui-virtual-keyboard@<version> --save
```

To access as module format in your code:

```javascript
var VirtualKeyboard = require('tui-virtual-keyboard');
var instance = new VirtualKeyboard(...);
```

### Use `bower`
Install the latest version using `bower` command:

```
$ bower install tui-virtual-keyboard
```

or want to install the each version:

```
$ bower install tui-virtual-keyboard#<tag>
```

To access as namespace format in your code:

```javascript
var instance = new tui.VirtualKeyboard(...);
```

### Download
* [Download bundle files from `dist` folder](https://github.com/nhnent/tui.virtual-keyboard/tree/production/dist)
* [Download all sources for each version](https://github.com/nhnent/tui.virtual-keyboard/releases)

## License
[MIT LICENSE](https://github.com/nhnent/tui.virtual-keyboard/blob/master/LICENSE)
