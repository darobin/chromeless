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
      bs            = require("byte-streams");


// XXX
//  - error handling
//  - docs
//  - tests
//  - not sure that we can read and write at the same time, but giving it a shot
//  - in order to make sure that we're always synced, we systematically open and close the archive
//    for every single operation. In the real world that's a bad idea, will have to figure out
//    a better approach
var compression;
function ZipHandle (path) {
    this.file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
    this.file.initWithPath(path);
    this.zipReader = Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
    // this.zipReader.open(file);
    this.zipWriter = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
    compression = Ci.nsIZipWriter.COMPRESSION_BEST;
    // this is PR_RDWR | PR_SYNC
    // this.zipWriter.open(file, 0x04 | 0x40);
}
ZipHandle.prototype = {
    _writerOp:    function (op) {
        var wasOpen = false;
        try {
            this.zipWriter.open(this.file, 0x04 | 0x40);
        }
        catch (e) {
            wasOpen = true;
        }
        console.log("wasOpen(writer) for " + op.name + "=" + wasOpen);
        // this is PR_RDWR | PR_SYNC
        var res = op();
        if (!wasOpen) this.zipWriter.close();
        return res;
    },
    _readerOp:    function (op) {
        var wasOpen = false;
        try {
            this.zipReader.open(this.file);
        }
        catch (e) {
            wasOpen = true;
        }
        console.log("wasOpen(reader) for " + op.name + "=" + wasOpen);
        var res = op();
        if (!wasOpen) this.zipReader.close();
        return res;
    },
    allEntryPaths:  function () {
        var self = this;
        return this._readerOp(function allEntryPaths () {
            var enum = self.zipReader.findEntries("*");
            var paths = [];
            while (enum.hasMore()) paths.push(enum.getNext());
            return paths;
        });
    },
    entryAsText:    function (path, charset) {
        var self = this;
        return this._readerOp(function entryAsText () {
            if (!self.hasEntry(path)) return null;
            var is = self.entryAsStream(path);
            var tr = new ts.TextReader(is, charset);
            var res = tr.read();
            self.zipReader.close();
            return res;
        });
    },
    entryAsBinary:  function (path) {
        var self = this;
        return this._readerOp(function entryAsBinary () {
            if (!self.hasEntry(path)) return null;
            var is = self.entryAsStream(path);
            var br = new bs.ByteReader(is);
            var res = br.read();
            self.zipReader.close();
            return res;
        });
    },
    // not documented on purpose, internal
    entryAsStream:    function (path) {
        // only works with already open archive
        return this.zipReader.getInputStream(path);
    },
    hasEntry:    function (path) {
        var self = this;
        return this._writerOp(function hasEntry () {
            return self.zipWriter.hasEntry(path);
        });
    },
    addDirectory:    function (path) {
        var self = this;
        return this._writerOp(function addDirectory () {
            self.zipWriter.addEntryDirectory(path, Date.now() * 1000, false);
        });
    },
    addEntryFromText:    function (path, string, charset) {
        var self = this;
        return this._writerOp(function addEntryFromText () {
            charset = charset ? charset : "UTF-8";
            var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                              .createInstance(Ci.nsIScriptableUnicodeConverter);
            converter.charset = charset;
            var is = converter.convertToInputStream(string);
            self.addEntryFromStream(path, is);
        });
    },
    addEntryFromBinary:    function (path, string) {
        // XXX
        throw("not implemented yet");
    },
    // not documented on purpose, internal
    addEntryFromStream:    function (path, stream) {
        var self = this;
        return this._writerOp(function addEntryFromStream () {
            self.removeEntry(path);
            self.zipWriter.addEntryStream(path, Date.now() * 1000, compression, stream, false);
        });
    },
    removeEntry:    function (path) {
        var self = this;
        return this._writerOp(function removeEntry () {
            if (!self.zipWriter.hasEntry(path)) return;
            self.zipWriter.removeEntry(path, false);
        });
    },
    close:    function () {
        try { this.zipReader.close(); } catch (e) {}
        try { this.zipWriter.close(); } catch (e) {}
    },
};

exports.open = function open (path) {
    return new ZipHandle(path);
};

