﻿// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
// *** CHANGE THE PLUGIN ID HERE *** - must match the "id" property in edittime.js
//          vvvvvvvv
cr.plugins_.JSON = function(runtime)
{
    this.runtime = runtime;
};

(function ()
{
    /////////////////////////////////////
    // *** CHANGE THE PLUGIN ID HERE *** - must match the "id" property in edittime.js
    //                            vvvvvvvv
    var pluginProto = cr.plugins_.JSON.prototype;
        
    /////////////////////////////////////
    // Object type class
    pluginProto.Type = function(plugin)
    {
        this.plugin = plugin;
        this.runtime = plugin.runtime;
    };

    var typeProto = pluginProto.Type.prototype;

    // called on startup for each object type
    typeProto.onCreate = function()
    {

    };

    /////////////////////////////////////
    // Instance class
    pluginProto.Instance = function(type)
    {
        this.type = type;
        this.runtime = type.runtime;
        
        // any other properties you need, e.g...
        // this.myValue = 0;
    };
    
    var instanceProto = pluginProto.Instance.prototype;
    var ROOT_KEY = "root";
    // called whenever an instance is created
    instanceProto.onCreate = function()
    {
        this.data = {};
        this.curKey = "";
        this.curValue = undefined;
        this.curPath = [];
    };
    
    // called whenever an instance is destroyed
    // note the runtime may keep the object after this call for recycling; be sure
    // to release/recycle/reset any references to other objects in this function.
    instanceProto.onDestroy = function ()
    {
        // note to myself:
        // implementing a caching system to limit garbage collection
        // would be useless since I can't force the JSON.parse function
        // to get new object from a cache
        this.data     = null;
        this.curKey   = null;
        this.curPath  = null;
        this.curValue = null;
    };
    
    // called when saving the full state of the game
    instanceProto.saveToJSON = function ()
    {
        // return a Javascript object containing information about your object's state
        // note you MUST use double-quote syntax (e.g. "property": value) to prevent
        // Closure Compiler renaming and breaking the save format
        return this.data[ROOT_KEY];
    };
    
    // called when loading the full state of the game
    instanceProto.loadFromJSON = function (o)
    {
        // load from_current the state previously saved by saveToJSON
        // 'o' provides the same object that you saved, e.g.
        // this.myValue = o["myValue"];
        // note you MUST use double-quote syntax (e.g. o["property"]) to prevent
        // Closure Compiler renaming and breaking the save format
        this.data[ROOT_KEY] = o;
    };
    
    
    // The comments around these functions ensure they are removed when exporting, since the
    // debugger code is no longer relevant after publishing.
    /**BEGIN-PREVIEWONLY**/

    // slightly modified neet simple function from Pumbaa80
    // http://stackoverflow.com/questions/4810841/how-can-i-pretty-print-json-using-javascript#answer-7220510
    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // basic html escaping
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'red';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'blue';
                    } else {
                        cls = 'green';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'Sienna';
                } else if (/null/.test(match)) {
                    cls = 'gray';
                }
                return '<span style="color:' + cls + ';">' + match + '</span>';
            })
            .replace(/\t/g,"&nbsp;&nbsp;") // to keep indentation in html
            .replace(/\n/g,"<br/>");       // to keep line break in html
    }

    instanceProto.getDebuggerValues = function (propsections)
    {
        // Append to propsections any debugger sections you want to appear.
        // Each section is an object with two members: "title" and "properties".
        // "properties" is an array of individual debugger properties to display
        // with their name and value, and some other optional settings.
        var str = JSON.stringify(this.data[ROOT_KEY],null,"\t");

        propsections.push({
            "title": "JSON",
            "properties": [
                {
                    "name":"content",
                    "value": "<span style=\"cursor:text;-webkit-user-select: text;-khtml-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;\">"+syntaxHighlight(str)+"</style>",
                    "html": true,
                    "readonly":true
                }

                // Each property entry can use the following values:
                // "name" (required): name of the property (must be unique within this section)
                // "value" (required): a boolean, number or string for the value
                // "html" (optional, default false): set to true to interpret the name and value
                //                                   as HTML strings rather than simple plain text
                // "readonly" (optional, default false): set to true to disable editing the property
                
                // Example:
                // {"name": "My property", "value": this.myValue}
            ]
        });
    };
    
    instanceProto.onDebugValueEdited = function (header, name, value)
    {
        // Called when a non-readonly property has been edited in the debugger. Usually you only
        // will need 'name' (the property name) and 'value', but you can also use 'header' (the
        // header title for the section) to distinguish properties with the same name.
        // if (name === "My property")
        //  this.myProperty = value;
    };
    /**END-PREVIEWONLY**/

    /**helper functions**/
    instanceProto.getValueFromPath = function(from_current, path) {
        if (from_current) {
            return this.getValueFromPath(
                    false,
                    this.curPath.concat(path)
                );
        } else {
            var path_ = [ROOT_KEY].concat(path);
            var value = this.data;

            for (var i = 0; i < path_.length; i++) {
                if (value === undefined) {
                    log("invalid path: root@"+ path.toString(),"warn");
                    break;
                } else if (value === null) {
                    // we avoid null 'cause null[i] will throw an error
                    if (i < path_.length - 1) {
                        // we won't find anything
                        // at the end of the path
                        log("invalid path: root@"+ path.toString(),"warn");
                        value = undefined;
                    }
                    break;
                } else { 
                    value = value[path_[i]];
                } 
            }
            return value;
        }
    };

    instanceProto.setValueFromPath = function(from_current, path, value) {
        
        if (from_current) {
            value = this.setValueFromPath(
                        false,
                        this.curPath.concat(path),
                        value
                    );
        } else {
            var path_ = [ROOT_KEY].concat(path);
            var obj   = this.data;
            for (var i = 0; i < path_.length; i++) {
                if (type(obj) === "array" ||
                    type(obj) === "object") {

                    if(i < path_.length-1) {
                        obj = obj[path_[i]];   // moving along
                    } else {
                        obj[path_[i]] = value; // silently create a new property if doesn't exist yet
                    }

                } else {
                    log("invalid path: root@"+ path.toString(),"warn");
                    return;
                }
            }
            
        }
    };


    function type(value) {
        if (value === undefined) {
            return "undefined";
        } else if (value === null) {
            return "null";
        } else if (value === !!value) {
            return "boolean";
        } else if (Object.prototype.toString.call(value) === "[object Number]") {
            return "number";    
        } else if (Object.prototype.toString.call(value) === "[object String]") {
            return "string";
        } else if (Object.prototype.toString.call(value) === "[object Array]") {
            return "array";
        } else if (Object.prototype.toString.call(value) === "[object Object]") {
            return "object";
        }
    }


    //////////////////////////////////////
    // Conditions
    function Cnds() {}

    // the example condition
    Cnds.prototype.IsObject = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "object";

    };
    Cnds.prototype.IsArray = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "array";
    };
    Cnds.prototype.IsBoolean = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "boolean";
    };
    Cnds.prototype.IsNumber = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "number";
    };
    Cnds.prototype.IsString = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "string";
    };
    Cnds.prototype.IsNull = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return type(value) === "null";
    };
    Cnds.prototype.IsUndefined = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        return value === undefined;
    };
    Cnds.prototype.IsEmpty = function (from_current,path)
    {
        var value = this.getValueFromPath(from_current === 1, path);
        var t = type(value);

        if (t === "array") {
            return value.length === 0;
        } else if (t === "object") {
            for (var p in value){
                if (Object.prototype.hasOwnProperty.call(value,p)) {
                    return false;
                }
            }
            return true;
        } else {
            return value === undefined; // any value other than undefined is considered not empty
        }
    };
    
    Cnds.prototype.ForEachProperty = function (from_current,path)
    {
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
        var solModifierAfterCnds = current_frame.isModifierAfterCnds();
        var current_loop = this.runtime.pushLoopStack();


        var lastPath = this.curPath; // keep a reference to the original Current Path
        var path_;
        if(from_current === 1 ) { 
            path_ = this.curPath.concat(path);
        } else {
            path_ = path;
        }
        var obj = this.getValueFromPath(false,path_);
        var p;
        if (solModifierAfterCnds) {
            for (p in obj) {
                if (Object.prototype.hasOwnProperty.call(obj,p)) {
                    this.curPath = path_.concat(p);
                    this.curKey = p;
                    this.curValue = obj[p];
                    this.runtime.pushCopySol(current_event.solModifiers);
                    current_event.retrigger();

                    /**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

                    this.runtime.popSol(current_event.solModifiers);
                    if (current_loop.stopped) {
                        break;
                    }
                }
            }
        } else {
            for (p in obj) {
                if (Object.prototype.hasOwnProperty.call(obj,p)) {
                    this.curPath = path_.concat(p);
                    this.curKey = p;
                    this.curValue = obj[p];
             
                    current_event.retrigger();

                    /**PREVIEWONLY**/if (this.runtime.hit_breakpoint) return;

                    if (current_loop.stopped) {
                        break;
                    }
                }
            }
        }
        this.curPath  = lastPath;
        this.curKey   = "";
        this.curValue = undefined;

        this.runtime.popLoopStack();
        return false;
    };



    pluginProto.cnds = new Cnds();
    
    //////////////////////////////////////
    // Actions
    function Acts() {}

    // the example action
    Acts.prototype.NewObject = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,{});
    };
    Acts.prototype.NewArray = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,[]);
    };
    Acts.prototype.SetValue = function (value,from_current,path)
    {
        this.setValueFromPath(from_current,path,value);
    };
    Acts.prototype.SetBoolean = function (value,from_current,path)
    {
        this.setValueFromPath(from_current,path,value === 0);
    };
    Acts.prototype.SetNull = function (from_current,path)
    {
        this.setValueFromPath(from_current,path,null);
    };
    Acts.prototype.Delete = function (from_current,path)
    {   
        var path_;
        if(from_current) {
            path_ = this.curPath.concat(path);
        } else {
            path_ = path;
        }

        function deleteIfValid(obj,prop) {
            if ( obj !== undefined && obj !== null && 
                 (typeof obj === "object") && obj[prop] !== undefined){
                
                delete obj[prop];
            } else {
                log("invalid path: root@"+ path_.toString(),"warn");
            }
        }

        if (path_.length === 0) {
            deleteIfValid(this.data,ROOT_KEY);
        } else {
            deleteIfValid(
                this.getValueFromPath(
                    false,
                    path_.slice(0,path.length-1) // go through all property but the last one
                ),
                path_.slice(-1) // get last property
            );
        }
    };

    Acts.prototype.Clear = function (from_current,path)
    {   
        var path_;
        if(from_current) {
            path_ = this.curPath.concat(path);
        } else {
            path_ = path;
        }

        function clearIfValid(obj,prop) {
            if ( obj !== undefined && obj !== null && 
                 (typeof obj === "object") && obj[prop] !== undefined){

                var t = type(obj[prop]);
                if(t === "array") {
                    obj[prop].length = 0;
                } else if (t === "object") {
                    for (var p in obj[prop]){
                        if (Object.prototype.hasOwnProperty.call(obj[prop],p)) {
                            delete obj[prop][p];
                        }
                    }
                } else {
                    delete obj[prop];
                }
            } else {
                log("invalid path: root@"+ path_.toString(),"warn");
            }
        }

        if (path_.length === 0) {
            clearIfValid(this.data,ROOT_KEY);
        } else {
            clearIfValid(
                this.getValueFromPath(
                    false,
                    path_.slice(0,path.length-1) // go through all property but the last one
                ),
                path_.slice(-1) // get last property
            );
        }
    };
    Acts.prototype.LoadJSON = function (json,from_current,path)
    {
        this.setValueFromPath(from_current,path,JSON.parse(json));
    };
    Acts.prototype.LogData = function ()
    {
        if(console.groupCollapsed !== undefined && console.groupEnd !== undefined) {
            console.groupCollapsed(ROOT_KEY+":");
            console.log(JSON.stringify(this.data[ROOT_KEY],null,2));
            console.groupEnd();
        } else {
            console.log(JSON.stringify(this.data[ROOT_KEY],null,2));
        }
        console.log("Current Path:", JSON.stringify(this.curPath));
    };

    Acts.prototype.SetCurrentPath = function(from_current,path) {
        if(from_current) {
            this.curPath = this.curPath.concat(path);
        } else {
            this.curPath = path.slice();
        }
    };
    
    // ... other actions here ...
    
    pluginProto.acts = new Acts();
    
    //////////////////////////////////////
    // Expressions
    function Exps() {}
    
    // the example expression
    Exps.prototype.Length = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        if (type(value) === "array") {
            ret.set_int(value.length);   
        } else {
            ret.set_int(0);
        }
    };

    Exps.prototype.Size = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift(); // ret
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if (t === "array") {
            ret.set_int(value.length);
        } else if (t === "object") {
            var size = 0;
            for (var p in value)
            {
                if (Object.prototype.hasOwnProperty.call(value,p)) {
                    size++;
                }
            }
            ret.set_int(size);
        } else {
            ret.set_int(-1);
        }
    };

    // the example expression
    Exps.prototype.Value = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if (t === "number" || t === "string") {
            ret.set_any(value);
        } else if (t === "boolean") {
            ret.set_any((value) ? 1 : 0);
        } else {
            ret.set_any(t);
        }
    };
    // deprecated
    Exps.prototype.ToJson = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if(t === "undefined") {
            ret.set_string(t);
        } else {
            ret.set_string(JSON.stringify(value));        
        }
    };
    Exps.prototype.AsJson = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        var t = type(value);
        if(t === "undefined") {
            ret.set_string(t);
        } else {
            ret.set_string(JSON.stringify(value));        
        }
    };

    Exps.prototype.TypeOf = function (ret)
    {  
        var path = Array.prototype.slice.call(arguments);
        path.shift();
        var from_current = path.shift();
        var value = this.getValueFromPath(from_current===1,path);
        ret.set_string(type(value));
    };
    

    Exps.prototype.CurrentKey = function (ret)
    {
        ret.set_string(this.curKey);
    };
    Exps.prototype.CurrentValue = function (ret)
    {
        var value = this.curValue;
        var t = type(value);
        if (t === "number" || t === "string") {
            ret.set_any(value);
        } else if (t === "boolean") {
            ret.set_any((value) ? 1 : 0);
        } else {
            ret.set_any(t);
        }        
    };


    pluginProto.exps = new Exps();

}());