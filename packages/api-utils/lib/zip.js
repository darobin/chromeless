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
* Allows for the reading and writing of Zip archives
*/

const {Cc,Ci,Cr}    = require("chrome"),
      xpcom         = require("xpcom"),
      ts            = require("text-streams"),
      bs            = require("btye-streams");


// XXX
//  - error handling
//  - docs
//  - tests
//  - not sure that we can read and write at the same time, but giving it a shot
function ZipHandle (nsZip) {
    var file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
    file.initWithPath(path);
    this.zipReader = Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
    this.zipReader.open(file);
    this.zipWriter = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
    this.compression = Ci.nsIZipWriter.COMPRESSION_BEST;
    this.zipWriter.open(file);
}
ZipHandle.prototype = {
    allEntryPaths:  function () {
        var enum = this.zipReader.findEntries("*");
        var paths = [];
        while (enum.hasMore()) paths.push(enum.getNext());
        return paths;
    },
    entryAsText:    function (path, charset) {
        if (!this.hasEntry(path)) return null;
        var is = this.entryAsStream(path);
        var tr = new ts.TextReader(is, charset);
        return tr.read();
    },
    entryAsBinary:  function (path) {
        if (!this.hasEntry(path)) return null;
        var is = this.entryAsStream(path);
        var br = new bs.ByteReader(is);
        return br.read();
    },
    // not documented on purpose, internal
    entryAsStream:    function (path) {
        var entry = this.zipReader.getEntry(path);
        return this.zipReader.getInputStream(entry);
    },
    hasEntry:    function (path) {
        return this.zipReader.hasEntry(path);
    },
    addDirectory:    function (path) {
        this.zipWriter.addEntryDirectory(path, Date.now() * 1000, false);
    },
    addEntryFromText:    function (path, string, charset) {
        charset ||= "UTF-8";
        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                          .createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = charset;
        var is = converter.convertToInputStream(string);
        this.addEntryFromStream(path, is);
    },
    addEntryFromBinary:    function (path, string) {
        // XXX
        throw("not implemented yet");
    },
    // not documented on purpose, internal
    addEntryFromStream:    function (path, stream) {
        this.zipWriter.addEntryStream(path, Date.now() * 1000, this.compression, stream, false);
    },
    removeEntry:    function (path) {
        if (!this.hasEntry(path)) return;
        this.zipWriter.removeEntry(path, false);
    },
    close:    function () {
        this.zipReader.close();
        this.zipWriter.close();
    },
};

exports.open = function open (path) {
    return new ZipHandle(path);
};

