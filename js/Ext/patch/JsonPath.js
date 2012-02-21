/***

The following code adds jsonPath functionality to Ext.grid.column.Column
It supports read/write access of deeply nested structures within store fields, and
(far as I can tell) functions correctly, throwing all the correct events.

It requires my ColumnSetterGetter patch as a prerequisite.

This code is copyright 2012 Daniel Norman.
It is free for use under the MIT licence.

***/

Ext.ns('Ext.patch');
Ext.patch.JsonPath = true;

Ext.require(['Ext.patch.ColumnSetterGetter']);

(function(){



var deepEquals = function( x, y ) {
  if ( x === y ) return true;                               // if both x and y are null or undefined and exactly the same
  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false; // if they are not strictly equal, they both need to be Objects
  if ( x.constructor !== y.constructor ) return false;      // they must have the exact same prototype chain, the closest we can do is test there constructor.
  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;                // other properties were tested using x.constructor === y.constructor
    if ( ! y.hasOwnProperty( p ) ) return false;            // allows to compare x[ p ] and y[ p ] when set to undefined
    if ( x[ p ] === y[ p ] ) continue;                      // if they have the same strict value or identity then they are equal
    if ( typeof( x[ p ] ) !== "object" ) return false;      // Numbers, Strings, Functions, Booleans must be strictly equal
    if ( ! deepEquals( x[ p ],  y[ p ] ) ) return false;    // Objects and Arrays must be tested recursively
  }

  for ( p in y ) {
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;  // allows x[ p ] to be set to undefined
  }
  return true;
}



// Including JSONPath inline for simplicity

/* JSONPath 0.8.5 - XPath for JSON
 * Copyright (c) 2007 Stefan Goessner (goessner.net)
 * Licensed under the MIT licence.
 * Forked to add necessary functionality: github.com/dnorman/jsonPath
*/

function jsonPath(obj, expr, arg) {
   var P = {
      rt: arg && arg.resultType || "VALUE",
      vivify: arg && arg.autoVivify || false, // experimental
      result: [],
      normalize: function(expr) {
         var subx = [];
         return expr.replace(/[\['](\??\(.*?\))[\]']|\['(.*?)'\]/g, function($0,$1,$2){return "[#"+(subx.push($1||$2)-1)+"]";})  /* http://code.google.com/p/jsonpath/issues/detail?id=4 */
                    .replace(/'?\.'?|\['?/g, ";")
                    .replace(/;;;|;;/g, ";..;")
                    .replace(/;$|'?\]|'$/g, "")
                    .replace(/#([0-9]+)/g, function($0,$1){return subx[$1];});
      },
      asPath: function(path) {
         var x = path.split(";"), p = "$";
         for (var i=1,n=x.length; i<n; i++)
            p += /^[0-9*]+$/.test(x[i]) ? ("["+x[i]+"]") : ("['"+x[i]+"']");
         return p;
      },
      asList: function(path){
         return path.split(";").slice(1);
      },
      store: function(p, v) {
         if (p) P.result[P.result.length] =
            P.rt == "PATH" ? P.asPath(p) : (
               P.rt == "LIST" ? P.asList(p) : v
            );
         return !!p;
      },
      trace: function(expr, val, path) {
         if (expr !== "") {
            var x = expr.split(";"), loc = x.shift();
            x = x.join(";");
            if (val && val.hasOwnProperty(loc))
               P.trace(x, val[loc], path + ";" + loc);
            else if (loc === "*")
               P.walk(loc, x, val, path, function(m,l,x,v,p) { P.trace(m+";"+x,v,p); });
            else if (loc === "..") {
               P.trace(x, val, path);
               P.walk(loc, x, val, path, function(m,l,x,v,p) { typeof v[m] === "object" && P.trace("..;"+x,v[m],p+";"+m); });
            }
            else if (/^\(.*?\)$/.test(loc)) // [(expr)]
               P.trace(P.eval(loc, val, path.substr(path.lastIndexOf(";")+1))+";"+x, val, path);
            else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
               P.walk(loc, x, val, path, function(m,l,x,v,p) { if (P.eval(l.replace(/^\?\((.*?)\)$/,"$1"), v instanceof Array ? v[m] : v, m)) P.trace(m+";"+x,v,p); }); // issue 5 resolved
            else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  phyton slice syntax
               P.slice(loc, x, val, path);
            else if (/,/.test(loc)) { // [name1,name2,...]
               for (var s=loc.split(/'?,'?/),i=0,n=s.length; i<n; i++)
                  P.trace(s[i]+";"+x, val, path);
            }
            else if( P.vivify && loc.length ){
               // the idea of autoVivify is pretty evil, and probably horribly broken in many ways. not sure how else to locate and set a non-existent node though.
               if( typeof val == 'object' && typeof val[loc] == 'undefined' ){
                  if (x.length) val[loc] = {};
                  P.trace(x, val[loc], path + ";" + loc);
               }
            }
         }
         else
            P.store(path, val);
      },
      walk: function(loc, expr, val, path, f) {
         if (val instanceof Array) {
            for (var i=0,n=val.length; i<n; i++)
               if (i in val)
                  f(i,loc,expr,val,path);
         }
         else if (typeof val === "object") {
            for (var m in val)
               if (val.hasOwnProperty(m))
                  f(m,loc,expr,val,path);
         }
      },
      slice: function(loc, expr, val, path) {
         if (val instanceof Array) {
            var len=val.length, start=0, end=len, step=1;
            loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function($0,$1,$2,$3){start=parseInt($1||start);end=parseInt($2||end);step=parseInt($3||step);});
            start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
            end   = (end < 0)   ? Math.max(0,end+len)   : Math.min(len,end);
            for (var i=start; i<end; i+=step)
               P.trace(i+";"+expr, val, path);
         }
      },
      eval: function(x, _v, _vname) {
         try { return $ && _v && eval(x.replace(/(^|[^\\])@/g, "$1_v").replace(/\\@/g, "@")); }  // issue 7 : resolved ..
         catch(e) { throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/(^|[^\\])@/g, "$1_v").replace(/\\@/g, "@")); }  // issue 7 : resolved ..
      }
   };

   var $ = obj;
   if (expr && obj && ( P.rt == "VALUE" || P.rt == "PATH" || P.rt == "LIST") ) {
      P.trace(P.normalize(expr).replace(/^\$;?/,""), obj, "$");  // issue 6 resolved
      return P.result.length ? P.result : false;
   }
}
//


var walk = function( val, path ){
    if ( typeof val != 'object' ) return null;
    if (path.length == 0) return val;
    return walk( val[ path[0] ], path.slice(1) ); // shouuuld work for both Array & Object
}


var filter = /[$\[\]\:\.]/;

// This override adds dataPath config key to Ext.grid.column.Column
// as well as automatic detection / conversion of dataIndex to dataPath

Ext.override(Ext.grid.column.Column, {
    initComponent: function() {
        var me = this;
        
        if (me.dataIndex && filter.test(me.dataIndex) ){
            me.dataPath = me.dataIndex;
            //delete me.dataIndex;
        }
        
        if(me.dataPath){ // THIS PART IS OPTIONAL. COULD JUST LET THE USER DO A CUSTOM SETTER/GETTER
            
            if(!me.getter) me.getter = function(record){
                return record.getByPath( me.dataPath );
            }
            if(!me.setter) me.setter = function(record, value){
                record.setByPath( me.dataPath, value );
            }
            if(!me.checkModified) me.checkModified = function(record, value){
                return false;
            }
        }
        
        me.callOverridden(arguments);
    }
});


// Custom additions to Ext.data.Model
Ext.override(Ext.data.Model,{
    getByPath: function(pathStr){
        var rv = jsonPath( this[this.persistenceProperty], pathStr );
        return rv ? (rv.length == 1 ? rv[0] : rv) : null;
    },
    setByPath: function(pathStr, setVal) {
        var me = this,
            fields = me.fields,
            modified = me.modified;
        
        var data  = me[me.persistenceProperty];
        var paths = jsonPath( data , pathStr , { resultType: 'LIST', autoVivify: true } );
        if(!paths) return false;
        
        // pathStr could match multiple paths, have to do the set for each one
        Ext.each(paths, function(path){
            if (path.length == 0) return;
            var rootKey = path[0],  rootRef = data[rootKey],
                endKey  = path[ path.length - 1 ],
                endRef = walk( data, path.slice(0,-1) ),
                field;
                
            if (fields) field = fields.get( rootKey );
            
            if (!endRef) throw "Sanity error - no endref";
            
            var currentVal = endRef[endKey];
            
            if (field && field.persist && !me.isEqual( currentVal , setVal )){
                if( modified[ rootKey ] ){
                    endRef[endKey] = setVal; // already modified. set prior to the deepEquals
                    if( deepEquals( modified[ rootKey ], rootRef ) ){
                        delete modified[fieldName];
                        me.dirty = false;
                        
                        for (key in modified) {
                            if (modified.hasOwnProperty(key)){
                                me.dirty = true;
                                break;
                            }
                        }
                    }
                }else{
                    me.dirty = true;
                    modified[ rootKey ] = Ext.clone(rootRef);
                    endRef[endKey] = setVal; // don't modify until we've cloned
                }
            }else{
                endRef[endKey] = setVal;
            }

            
            if (!me.editing) {
                me.afterEdit();
            }
        });
        
        return true;
    }
});
//





})();