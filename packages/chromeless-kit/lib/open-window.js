/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is for Wocuments.
 *
 * The Initial Developer of the Original Code is
 *   Robin Berjon <robin@berjon.com>
 *
 * Contributor(s):
 *   Robin Berjon <robin@berjon.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
* Opens windows
*/

const {Cc, Ci, Cu} = require("chrome");

const ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
             .getService(Ci.nsIWindowWatcher);

function Window (options) {
    memory.track(this);

    function trueIsYes (x) { return x ? "yes" : "no"; }
    var features = ["width=" + options.width,
                    "height=" + options.height,
                    // "centerscreen=yes"
                 ];

    if (options.titleBar == false) features.push("titlebar=no");
    features.push("resizable=" + trueIsYes(options.resizable));
    features.push("menubar=" + trueIsYes(options.menubar));

    console.log(">>> openWindow=" + options.url);
    var window = ww.openWindow(null, options.url, null, features.join(","), null);
    this._window = window;
    // XXX a dangerously simplistic approach
    if (options.injectProps) {
        for (var k in options.injectProps) {
            window[k] = options.injectProps[k];
        }
    }
    this.options = options;
    window.addEventListener("close", this, false);
}
Window.prototype = {
    close: function () {
        this._window.close();
    },
    handleEvent: function handleEvent (event) {
        switch (event.type) {
            case "close":
                if (event.target == this._window) {
                    this._window.removeEventListener("close", this, false);
                    if (this.options.onclose) this.options.onclose();
                }
                break;
        };
    },
};

exports.open = function (options) {
    return new Window(options);
};
