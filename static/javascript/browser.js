(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.babel = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("./plugins/flow");

var _acornJsxInject = require("acorn-jsx/inject");

var _acornJsxInject2 = _interopRequireDefault(_acornJsxInject);

var _srcIndex = require("./src/index");

var acorn = _interopRequireWildcard(_srcIndex);

_defaults(exports, _interopRequireWildcard(_srcIndex));

(0, _acornJsxInject2["default"])(acorn);
},{"./plugins/flow":2,"./src/index":5,"acorn-jsx/inject":172}],2:[function(require,module,exports){
"use strict";

var acorn = require("../src/index");

var pp = acorn.Parser.prototype;
var tt = acorn.tokTypes;

pp.isRelational = function (op) {
  return this.type === tt.relational && this.value === op;
};

pp.expectRelational = function (op) {
  if (this.isRelational(op)) {
    this.next();
  } else {
    this.unexpected();
  }
};

pp.flow_parseDeclareClass = function (node) {
  this.next();
  this.flow_parseInterfaceish(node, true);
  return this.finishNode(node, "DeclareClass");
};

pp.flow_parseDeclareFunction = function (node) {
  this.next();

  var id = node.id = this.parseIdent();

  var typeNode = this.startNode();
  var typeContainer = this.startNode();

  if (this.isRelational("<")) {
    typeNode.typeParameters = this.flow_parseTypeParameterDeclaration();
  } else {
    typeNode.typeParameters = null;
  }

  this.expect(tt.parenL);
  var tmp = this.flow_parseFunctionTypeParams();
  typeNode.params = tmp.params;
  typeNode.rest = tmp.rest;
  this.expect(tt.parenR);

  this.expect(tt.colon);
  typeNode.returnType = this.flow_parseType();

  typeContainer.typeAnnotation = this.finishNode(typeNode, "FunctionTypeAnnotation");
  id.typeAnnotation = this.finishNode(typeContainer, "TypeAnnotation");

  this.finishNode(id, id.type);

  this.semicolon();

  return this.finishNode(node, "DeclareFunction");
};

pp.flow_parseDeclare = function (node) {
  if (this.type === tt._class) {
    return this.flow_parseDeclareClass(node);
  } else if (this.type === tt._function) {
    return this.flow_parseDeclareFunction(node);
  } else if (this.type === tt._var) {
    return this.flow_parseDeclareVariable(node);
  } else if (this.isContextual("module")) {
    return this.flow_parseDeclareModule(node);
  } else {
    this.unexpected();
  }
};

pp.flow_parseDeclareVariable = function (node) {
  this.next();
  node.id = this.flow_parseTypeAnnotatableIdentifier();
  this.semicolon();
  return this.finishNode(node, "DeclareVariable");
};

pp.flow_parseDeclareModule = function (node) {
  this.next();

  if (this.type === tt.string) {
    node.id = this.parseExprAtom();
  } else {
    node.id = this.parseIdent();
  }

  var bodyNode = node.body = this.startNode();
  var body = bodyNode.body = [];
  this.expect(tt.braceL);
  while (this.type !== tt.braceR) {
    var node2 = this.startNode();

    // todo: declare check
    this.next();

    body.push(this.flow_parseDeclare(node2));
  }
  this.expect(tt.braceR);

  this.finishNode(bodyNode, "BlockStatement");
  return this.finishNode(node, "DeclareModule");
};

// Interfaces

pp.flow_parseInterfaceish = function (node, allowStatic) {
  node.id = this.parseIdent();

  if (this.isRelational("<")) {
    node.typeParameters = this.flow_parseTypeParameterDeclaration();
  } else {
    node.typeParameters = null;
  }

  node["extends"] = [];

  if (this.eat(tt._extends)) {
    do {
      node["extends"].push(this.flow_parseInterfaceExtends());
    } while (this.eat(tt.comma));
  }

  node.body = this.flow_parseObjectType(allowStatic);
};

pp.flow_parseInterfaceExtends = function () {
  var node = this.startNode();

  node.id = this.parseIdent();
  if (this.isRelational("<")) {
    node.typeParameters = this.flow_parseTypeParameterInstantiation();
  } else {
    node.typeParameters = null;
  }

  return this.finishNode(node, "InterfaceExtends");
};

pp.flow_parseInterface = function (node) {
  this.flow_parseInterfaceish(node, false);
  return this.finishNode(node, "InterfaceDeclaration");
};

// Type aliases

pp.flow_parseTypeAlias = function (node) {
  node.id = this.parseIdent();

  if (this.isRelational("<")) {
    node.typeParameters = this.flow_parseTypeParameterDeclaration();
  } else {
    node.typeParameters = null;
  }

  var oldInType = this.inType;
  this.inType = true;

  this.expect(tt.eq);

  node.right = this.flow_parseType();

  this.inType = oldInType;

  this.semicolon();

  return this.finishNode(node, "TypeAlias");
};

// Type annotations

pp.flow_parseTypeParameterDeclaration = function () {
  var node = this.startNode();
  node.params = [];

  this.expectRelational("<");
  while (!this.isRelational(">")) {
    node.params.push(this.flow_parseTypeAnnotatableIdentifier());
    if (!this.isRelational(">")) {
      this.expect(tt.comma);
    }
  }
  this.expectRelational(">");

  return this.finishNode(node, "TypeParameterDeclaration");
};

pp.flow_parseTypeParameterInstantiation = function () {
  var node = this.startNode(),
      oldInType = this.inType;
  node.params = [];

  this.inType = true;

  this.expectRelational("<");
  while (!this.isRelational(">")) {
    node.params.push(this.flow_parseType());
    if (!this.isRelational(">")) {
      this.expect(tt.comma);
    }
  }
  this.expectRelational(">");

  this.inType = oldInType;

  return this.finishNode(node, "TypeParameterInstantiation");
};

pp.flow_parseObjectPropertyKey = function () {
  return this.type === tt.num || this.type === tt.string ? this.parseExprAtom() : this.parseIdent(true);
};

pp.flow_parseObjectTypeIndexer = function (node, isStatic) {
  node["static"] = isStatic;

  this.expect(tt.bracketL);
  node.id = this.flow_parseObjectPropertyKey();
  this.expect(tt.colon);
  node.key = this.flow_parseType();
  this.expect(tt.bracketR);
  this.expect(tt.colon);
  node.value = this.flow_parseType();

  this.flow_objectTypeSemicolon();
  return this.finishNode(node, "ObjectTypeIndexer");
};

pp.flow_parseObjectTypeMethodish = function (node) {
  node.params = [];
  node.rest = null;
  node.typeParameters = null;

  if (this.isRelational("<")) {
    node.typeParameters = this.flow_parseTypeParameterDeclaration();
  }

  this.expect(tt.parenL);
  while (this.type === tt.name) {
    node.params.push(this.flow_parseFunctionTypeParam());
    if (this.type !== tt.parenR) {
      this.expect(tt.comma);
    }
  }

  if (this.eat(tt.ellipsis)) {
    node.rest = this.flow_parseFunctionTypeParam();
  }
  this.expect(tt.parenR);
  this.expect(tt.colon);
  node.returnType = this.flow_parseType();

  return this.finishNode(node, "FunctionTypeAnnotation");
};

pp.flow_parseObjectTypeMethod = function (start, isStatic, key) {
  var node = this.startNodeAt(start);
  node.value = this.flow_parseObjectTypeMethodish(this.startNodeAt(start));
  node["static"] = isStatic;
  node.key = key;
  node.optional = false;
  this.flow_objectTypeSemicolon();
  return this.finishNode(node, "ObjectTypeProperty");
};

pp.flow_parseObjectTypeCallProperty = function (node, isStatic) {
  var valueNode = this.startNode();
  node["static"] = isStatic;
  node.value = this.flow_parseObjectTypeMethodish(valueNode);
  this.flow_objectTypeSemicolon();
  return this.finishNode(node, "ObjectTypeCallProperty");
};

pp.flow_parseObjectType = function (allowStatic) {
  var nodeStart = this.startNode();
  var node;
  var optional = false;
  var property;
  var propertyKey;
  var propertyTypeAnnotation;
  var token;
  var isStatic;

  nodeStart.callProperties = [];
  nodeStart.properties = [];
  nodeStart.indexers = [];

  this.expect(tt.braceL);

  while (this.type !== tt.braceR) {
    var start = this.markPosition();
    node = this.startNode();
    if (allowStatic && this.isContextual("static")) {
      this.next();
      isStatic = true;
    }

    if (this.type === tt.bracketL) {
      nodeStart.indexers.push(this.flow_parseObjectTypeIndexer(node, isStatic));
    } else if (this.type === tt.parenL || this.isRelational("<")) {
      nodeStart.callProperties.push(this.flow_parseObjectTypeCallProperty(node, allowStatic));
    } else {
      if (isStatic && this.type === tt.colon) {
        propertyKey = this.parseIdent();
      } else {
        propertyKey = this.flow_parseObjectPropertyKey();
      }
      if (this.isRelational("<") || this.type === tt.parenL) {
        // This is a method property
        nodeStart.properties.push(this.flow_parseObjectTypeMethod(start, isStatic, propertyKey));
      } else {
        if (this.eat(tt.question)) {
          optional = true;
        }
        this.expect(tt.colon);
        node.key = propertyKey;
        node.value = this.flow_parseType();
        node.optional = optional;
        node["static"] = isStatic;
        this.flow_objectTypeSemicolon();
        nodeStart.properties.push(this.finishNode(node, "ObjectTypeProperty"));
      }
    }
  }

  this.expect(tt.braceR);

  return this.finishNode(nodeStart, "ObjectTypeAnnotation");
};

pp.flow_objectTypeSemicolon = function () {
  if (!this.eat(tt.semi) && !this.eat(tt.comma) && this.type !== tt.braceR) {
    this.unexpected();
  }
};

pp.flow_parseGenericType = function (start, id) {
  var node = this.startNodeAt(start);

  node.typeParameters = null;
  node.id = id;

  while (this.eat(tt.dot)) {
    var node2 = this.startNodeAt(start);
    node2.qualification = node.id;
    node2.id = this.parseIdent();
    node.id = this.finishNode(node2, "QualifiedTypeIdentifier");
  }

  if (this.isRelational("<")) {
    node.typeParameters = this.flow_parseTypeParameterInstantiation();
  }

  return this.finishNode(node, "GenericTypeAnnotation");
};

pp.flow_parseVoidType = function () {
  var node = this.startNode();
  this.expect(tt._void);
  return this.finishNode(node, "VoidTypeAnnotation");
};

pp.flow_parseTypeofType = function () {
  var node = this.startNode();
  this.expect(tt._typeof);
  node.argument = this.flow_parsePrimaryType();
  return this.finishNode(node, "TypeofTypeAnnotation");
};

pp.flow_parseTupleType = function () {
  var node = this.startNode();
  node.types = [];
  this.expect(tt.bracketL);
  // We allow trailing commas
  while (this.pos < this.input.length && this.type !== tt.bracketR) {
    node.types.push(this.flow_parseType());
    if (this.type === tt.bracketR) break;
    this.expect(tt.comma);
  }
  this.expect(tt.bracketR);
  return this.finishNode(node, "TupleTypeAnnotation");
};

pp.flow_parseFunctionTypeParam = function () {
  var optional = false;
  var node = this.startNode();
  node.name = this.parseIdent();
  if (this.eat(tt.question)) {
    optional = true;
  }
  this.expect(tt.colon);
  node.optional = optional;
  node.typeAnnotation = this.flow_parseType();
  return this.finishNode(node, "FunctionTypeParam");
};

pp.flow_parseFunctionTypeParams = function () {
  var ret = { params: [], rest: null };
  while (this.type === tt.name) {
    ret.params.push(this.flow_parseFunctionTypeParam());
    if (this.type !== tt.parenR) {
      this.expect(tt.comma);
    }
  }
  if (this.eat(tt.ellipsis)) {
    ret.rest = this.flow_parseFunctionTypeParam();
  }
  return ret;
};

pp.flow_identToTypeAnnotation = function (start, node, id) {
  switch (id.name) {
    case "any":
      return this.finishNode(node, "AnyTypeAnnotation");

    case "bool":
    case "boolean":
      return this.finishNode(node, "BooleanTypeAnnotation");

    case "number":
      return this.finishNode(node, "NumberTypeAnnotation");

    case "string":
      return this.finishNode(node, "StringTypeAnnotation");

    default:
      return this.flow_parseGenericType(start, id);
  }
};

// The parsing of types roughly parallels the parsing of expressions, and
// primary types are kind of like primary expressions...they're the
// primitives with which other types are constructed.
pp.flow_parsePrimaryType = function () {
  var typeIdentifier = null;
  var params = null;
  var returnType = null;
  var start = this.markPosition();
  var node = this.startNode();
  var rest = null;
  var tmp;
  var typeParameters;
  var token;
  var type;
  var isGroupedType = false;

  switch (this.type) {
    case tt.name:
      return this.flow_identToTypeAnnotation(start, node, this.parseIdent());

    case tt.braceL:
      return this.flow_parseObjectType();

    case tt.bracketL:
      return this.flow_parseTupleType();

    case tt.relational:
      if (this.value === "<") {
        node.typeParameters = this.flow_parseTypeParameterDeclaration();
        this.expect(tt.parenL);
        tmp = this.flow_parseFunctionTypeParams();
        node.params = tmp.params;
        node.rest = tmp.rest;
        this.expect(tt.parenR);

        this.expect(tt.arrow);

        node.returnType = this.flow_parseType();

        return this.finishNode(node, "FunctionTypeAnnotation");
      }

    case tt.parenL:
      this.next();

      // Check to see if this is actually a grouped type
      if (this.type !== tt.parenR && this.type !== tt.ellipsis) {
        if (this.type === tt.name) {
          var token = this.lookahead().type;
          isGroupedType = token !== tt.question && token !== tt.colon;
        } else {
          isGroupedType = true;
        }
      }

      if (isGroupedType) {
        type = this.flow_parseType();
        this.expect(tt.parenR);

        // If we see a => next then someone was probably confused about
        // function types, so we can provide a better error message
        if (this.eat(tt.arrow)) {
          this.raise(node, "Unexpected token =>. It looks like " + "you are trying to write a function type, but you ended up " + "writing a grouped type followed by an =>, which is a syntax " + "error. Remember, function type parameters are named so function " + "types look like (name1: type1, name2: type2) => returnType. You " + "probably wrote (type1) => returnType");
        }

        return type;
      }

      tmp = this.flow_parseFunctionTypeParams();
      node.params = tmp.params;
      node.rest = tmp.rest;

      this.expect(tt.parenR);

      this.expect(tt.arrow);

      node.returnType = this.flow_parseType();
      node.typeParameters = null;

      return this.finishNode(node, "FunctionTypeAnnotation");

    case tt.string:
      node.value = this.value;
      node.raw = this.input.slice(this.start, this.end);
      this.next();
      return this.finishNode(node, "StringLiteralTypeAnnotation");

    default:
      if (this.type.keyword) {
        switch (this.type.keyword) {
          case "void":
            return this.flow_parseVoidType();

          case "typeof":
            return this.flow_parseTypeofType();
        }
      }
  }

  this.unexpected();
};

pp.flow_parsePostfixType = function () {
  var node = this.startNode();
  var type = node.elementType = this.flow_parsePrimaryType();
  if (this.type === tt.bracketL) {
    this.expect(tt.bracketL);
    this.expect(tt.bracketR);
    return this.finishNode(node, "ArrayTypeAnnotation");
  }
  return type;
};

pp.flow_parsePrefixType = function () {
  var node = this.startNode();
  if (this.eat(tt.question)) {
    node.typeAnnotation = this.flow_parsePrefixType();
    return this.finishNode(node, "NullableTypeAnnotation");
  }
  return this.flow_parsePostfixType();
};

pp.flow_parseIntersectionType = function () {
  var node = this.startNode();
  var type = this.flow_parsePrefixType();
  node.types = [type];
  while (this.eat(tt.bitwiseAND)) {
    node.types.push(this.flow_parsePrefixType());
  }
  return node.types.length === 1 ? type : this.finishNode(node, "IntersectionTypeAnnotation");
};

pp.flow_parseUnionType = function () {
  var node = this.startNode();
  var type = this.flow_parseIntersectionType();
  node.types = [type];
  while (this.eat(tt.bitwiseOR)) {
    node.types.push(this.flow_parseIntersectionType());
  }
  return node.types.length === 1 ? type : this.finishNode(node, "UnionTypeAnnotation");
};

pp.flow_parseType = function () {
  var oldInType = this.inType;
  this.inType = true;
  var type = this.flow_parseUnionType();
  this.inType = oldInType;
  return type;
};

pp.flow_parseTypeAnnotation = function () {
  var node = this.startNode();

  var oldInType = this.inType;
  this.inType = true;
  this.expect(tt.colon);
  node.typeAnnotation = this.flow_parseType();
  this.inType = oldInType;

  return this.finishNode(node, "TypeAnnotation");
};

pp.flow_parseTypeAnnotatableIdentifier = function (requireTypeAnnotation, canBeOptionalParam) {
  var node = this.startNode();
  var ident = this.parseIdent();
  var isOptionalParam = false;

  if (canBeOptionalParam && this.eat(tt.question)) {
    this.expect(tt.question);
    isOptionalParam = true;
  }

  if (requireTypeAnnotation || this.type === tt.colon) {
    ident.typeAnnotation = this.flow_parseTypeAnnotation();
    this.finishNode(ident, ident.type);
  }

  if (isOptionalParam) {
    ident.optional = true;
    this.finishNode(ident, ident.type);
  }

  return ident;
};

acorn.plugins.flow = function (instance) {
  // function name(): string {}
  instance.extend("parseFunctionBody", function (inner) {
    return function (node, allowExpression) {
      if (this.type === tt.colon) {
        node.returnType = this.flow_parseTypeAnnotation();
      }

      return inner.call(this, node, allowExpression);
    };
  });

  instance.extend("parseStatement", function (inner) {
    return function (declaration, topLevel) {
      // strict mode handling of `interface` since it's a reserved word
      if (this.strict && this.type === tt.name && this.value === "interface") {
        var node = this.startNode();
        this.next();
        return this.flow_parseInterface(node);
      } else {
        return inner.call(this, declaration, topLevel);
      }
    };
  });

  instance.extend("parseExpressionStatement", function (inner) {
    return function (node, expr) {
      if (expr.type === "Identifier") {
        if (expr.name === "declare") {
          if (this.type === tt._class || this.type === tt.name || this.type === tt._function || this.type === tt._var) {
            return this.flow_parseDeclare(node);
          }
        } else if (this.type === tt.name) {
          if (expr.name === "interface") {
            return this.flow_parseInterface(node);
          } else if (expr.name === "type") {
            return this.flow_parseTypeAlias(node);
          }
        }
      }

      return inner.call(this, node, expr);
    };
  });

  instance.extend("shouldParseExportDeclaration", function (inner) {
    return function () {
      return this.isContextual("type") || inner.call(this);
    };
  });

  instance.extend("parseParenItem", function (inner) {
    return function (node, start) {
      if (this.type === tt.colon) {
        var typeCastNode = this.startNodeAt(start);
        typeCastNode.expression = node;
        typeCastNode.typeAnnotation = this.flow_parseTypeAnnotation();
        return this.finishNode(typeCastNode, "TypeCastExpression");
      } else {
        return node;
      }
    };
  });

  instance.extend("parseClassId", function (inner) {
    return function (node, isStatement) {
      inner.call(this, node, isStatement);
      if (this.isRelational("<")) {
        node.typeParameters = this.flow_parseTypeParameterDeclaration();
      }
    };
  });

  instance.extend("readToken", function (inner) {
    return function (code) {
      if (this.inType && (code === 62 || code === 60)) {
        return this.finishOp(tt.relational, 1);
      } else {
        return inner.call(this, code);
      }
    };
  });

  instance.extend("jsx_readToken", function (inner) {
    return function () {
      if (!this.inType) return inner.call(this);
    };
  });

  instance.extend("parseParenArrowList", function (inner) {
    return function (start, exprList, isAsync) {
      for (var i = 0; i < exprList.length; i++) {
        var listItem = exprList[i];
        if (listItem.type === "TypeCastExpression") {
          var expr = listItem.expression;
          expr.typeAnnotation = listItem.typeAnnotation;
          exprList[i] = expr;
        }
      }
      return inner.call(this, start, exprList, isAsync);
    };
  });

  instance.extend("parseClassProperty", function (inner) {
    return function (node) {
      if (this.type === tt.colon) {
        node.typeAnnotation = this.flow_parseTypeAnnotation();
      }
      return inner.call(this, node);
    };
  });
  instance.extend("isClassProperty", function (inner) {
    return function () {
      return this.type === tt.colon || inner.call(this);
    };
  });

  instance.extend("parseClassMethod", function (inner) {
    return function (classBody, method, isGenerator, isAsync) {
      var typeParameters;
      if (this.isRelational("<")) {
        typeParameters = this.flow_parseTypeParameterDeclaration();
      }
      method.value = this.parseMethod(isGenerator, isAsync);
      method.value.typeParameters = typeParameters;
      classBody.body.push(this.finishNode(method, "MethodDefinition"));
    };
  });

  instance.extend("parseClassSuper", function (inner) {
    return function (node, isStatement) {
      inner.call(this, node, isStatement);
      if (node.superClass && this.isRelational("<")) {
        node.superTypeParameters = this.flow_parseTypeParameterInstantiation();
      }
      if (this.isContextual("implements")) {
        this.next();
        var implemented = node["implements"] = [];
        do {
          var node = this.startNode();
          node.id = this.parseIdent();
          if (this.isRelational("<")) {
            node.typeParameters = this.flow_parseTypeParameterInstantiation();
          } else {
            node.typeParameters = null;
          }
          implemented.push(this.finishNode(node, "ClassImplements"));
        } while (this.eat(tt.comma));
      }
    };
  });

  instance.extend("parseObjPropValue", function (inner) {
    return function (prop) {
      var typeParameters;
      if (this.isRelational("<")) {
        typeParameters = this.flow_parseTypeParameterDeclaration();
        if (this.type !== tt.parenL) this.unexpected();
      }
      inner.apply(this, arguments);
      prop.value.typeParameters = typeParameters;
    };
  });

  instance.extend("parseAssignableListItemTypes", function (inner) {
    return function (param) {
      if (this.eat(tt.question)) {
        param.optional = true;
      }
      if (this.type === tt.colon) {
        param.typeAnnotation = this.flow_parseTypeAnnotation();
      }
      this.finishNode(param, param.type);
      return param;
    };
  });

  instance.extend("parseImportSpecifiers", function (inner) {
    return function (node) {
      node.isType = false;
      if (this.isContextual("type")) {
        var start = this.markPosition();
        var typeId = this.parseIdent();
        if (this.type === tt.name && this.value !== "from" || this.type === tt.braceL || this.type === tt.star) {
          node.isType = true;
        } else {
          node.specifiers.push(this.parseImportSpecifierDefault(typeId, start));
          if (this.isContextual("from")) return;
          this.eat(tt.comma);
        }
      }
      inner.call(this, node);
    };
  });

  // function foo<T>() {}
  instance.extend("parseFunctionParams", function (inner) {
    return function (node) {
      if (this.isRelational("<")) {
        node.typeParameters = this.flow_parseTypeParameterDeclaration();
      }
      inner.call(this, node);
    };
  });

  // var foo: string = bar
  instance.extend("parseVarHead", function (inner) {
    return function (decl) {
      inner.call(this, decl);
      if (this.type === tt.colon) {
        decl.id.typeAnnotation = this.flow_parseTypeAnnotation();
        this.finishNode(decl.id, decl.id.type);
      }
    };
  });
};
},{"../src/index":5}],3:[function(require,module,exports){
// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

"use strict";

var _tokentype = require("./tokentype");

var _state = require("./state");

var _identifier = require("./identifier");

var _util = require("./util");

var pp = _state.Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp.checkPropClash = function (prop, propHash) {
  if (this.options.ecmaVersion >= 6) return;
  var key = prop.key,
      name = undefined;
  switch (key.type) {
    case "Identifier":
      name = key.name;break;
    case "Literal":
      name = String(key.value);break;
    default:
      return;
  }
  var kind = prop.kind || "init",
      other = undefined;
  if ((0, _util.has)(propHash, name)) {
    other = propHash[name];
    var isGetSet = kind !== "init";
    if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init)) this.raise(key.start, "Redefinition of property");
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp.parseExpression = function (noIn, refShorthandDefaultPos) {
  var start = this.markPosition();
  var expr = this.parseMaybeAssign(noIn, refShorthandDefaultPos);
  if (this.type === _tokentype.types.comma) {
    var node = this.startNodeAt(start);
    node.expressions = [expr];
    while (this.eat(_tokentype.types.comma)) node.expressions.push(this.parseMaybeAssign(noIn, refShorthandDefaultPos));
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp.parseMaybeAssign = function (noIn, refShorthandDefaultPos, afterLeftParse) {
  if (this.type == _tokentype.types._yield && this.inGenerator) return this.parseYield();

  var failOnShorthandAssign = undefined;
  if (!refShorthandDefaultPos) {
    refShorthandDefaultPos = { start: 0 };
    failOnShorthandAssign = true;
  } else {
    failOnShorthandAssign = false;
  }
  var start = this.markPosition();
  if (this.type == _tokentype.types.parenL || this.type == _tokentype.types.name) this.potentialArrowAt = this.start;
  var left = this.parseMaybeConditional(noIn, refShorthandDefaultPos);
  if (afterLeftParse) left = afterLeftParse.call(this, left, start);
  if (this.type.isAssign) {
    var node = this.startNodeAt(start);
    node.operator = this.value;
    node.left = this.type === _tokentype.types.eq ? this.toAssignable(left) : left;
    refShorthandDefaultPos.start = 0; // reset because shorthand default was used correctly
    this.checkLVal(left);
    if (left.parenthesizedExpression) {
      var errorMsg = undefined;
      if (left.type === "ObjectPattern") {
        errorMsg = "`({a}) = 0` use `({a} = 0)`";
      } else if (left.type === "ArrayPattern") {
        errorMsg = "`([a]) = 0` use `([a] = 0)`";
      }
      if (errorMsg) {
        this.raise(left.start, "You're trying to assign to a parenthesized expression, eg. instead of " + errorMsg);
      }
    }
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression");
  } else if (failOnShorthandAssign && refShorthandDefaultPos.start) {
    this.unexpected(refShorthandDefaultPos.start);
  }
  return left;
};

// Parse a ternary conditional (`?:`) operator.

pp.parseMaybeConditional = function (noIn, refShorthandDefaultPos) {
  var start = this.markPosition();
  var expr = this.parseExprOps(noIn, refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) return expr;
  if (this.eat(_tokentype.types.question)) {
    var node = this.startNodeAt(start);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(_tokentype.types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};

// Start the precedence parser.

pp.parseExprOps = function (noIn, refShorthandDefaultPos) {
  var start = this.markPosition();
  var expr = this.parseMaybeUnary(refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) return expr;
  return this.parseExprOp(expr, start, -1, noIn);
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp.parseExprOp = function (left, leftStart, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== _tokentype.types._in)) {
    if (prec > minPrec) {
      var node = this.startNodeAt(leftStart);
      node.left = left;
      node.operator = this.value;
      var op = this.type;
      this.next();
      var _start = this.markPosition();
      node.right = this.parseExprOp(this.parseMaybeUnary(), _start, op.rightAssociative ? prec - 1 : prec, noIn);
      this.finishNode(node, op === _tokentype.types.logicalOR || op === _tokentype.types.logicalAND ? "LogicalExpression" : "BinaryExpression");
      return this.parseExprOp(node, leftStart, minPrec, noIn);
    }
  }
  return left;
};

// Parse unary operators, both prefix and postfix.

pp.parseMaybeUnary = function (refShorthandDefaultPos) {
  if (this.type.prefix) {
    var node = this.startNode(),
        update = this.type === _tokentype.types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary();
    if (refShorthandDefaultPos && refShorthandDefaultPos.start) this.unexpected(refShorthandDefaultPos.start);
    if (update) this.checkLVal(node.argument);else if (this.strict && node.operator === "delete" && node.argument.type === "Identifier") this.raise(node.start, "Deleting local variable in strict mode");
    return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  }
  var start = this.markPosition();
  var expr = this.parseExprSubscripts(refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) return expr;
  while (this.type.postfix && !this.canInsertSemicolon()) {
    var node = this.startNodeAt(start);
    node.operator = this.value;
    node.prefix = false;
    node.argument = expr;
    this.checkLVal(expr);
    this.next();
    expr = this.finishNode(node, "UpdateExpression");
  }
  return expr;
};

// Parse call, dot, and `[]`-subscript expressions.

pp.parseExprSubscripts = function (refShorthandDefaultPos) {
  var start = this.markPosition();
  var expr = this.parseExprAtom(refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) return expr;
  return this.parseSubscripts(expr, start);
};

pp.parseSubscripts = function (base, start, noCalls) {
  if (this.eat(_tokentype.types.dot)) {
    var node = this.startNodeAt(start);
    node.object = base;
    node.property = this.parseIdent(true);
    node.computed = false;
    return this.parseSubscripts(this.finishNode(node, "MemberExpression"), start, noCalls);
  } else if (this.eat(_tokentype.types.bracketL)) {
    var node = this.startNodeAt(start);
    node.object = base;
    node.property = this.parseExpression();
    node.computed = true;
    this.expect(_tokentype.types.bracketR);
    return this.parseSubscripts(this.finishNode(node, "MemberExpression"), start, noCalls);
  } else if (!noCalls && this.eat(_tokentype.types.parenL)) {
    var node = this.startNodeAt(start);
    node.callee = base;
    node.arguments = this.parseExprList(_tokentype.types.parenR, this.options.features["es7.trailingFunctionCommas"]);
    return this.parseSubscripts(this.finishNode(node, "CallExpression"), start, noCalls);
  } else if (this.type === _tokentype.types.backQuote) {
    var node = this.startNodeAt(start);
    node.tag = base;
    node.quasi = this.parseTemplate();
    return this.parseSubscripts(this.finishNode(node, "TaggedTemplateExpression"), start, noCalls);
  }return base;
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp.parseExprAtom = function (refShorthandDefaultPos) {
  var node = undefined,
      canBeArrow = this.potentialArrowAt == this.start;
  switch (this.type) {
    case _tokentype.types._this:
    case _tokentype.types._super:
      var type = this.type === _tokentype.types._this ? "ThisExpression" : "Super";
      node = this.startNode();
      this.next();
      return this.finishNode(node, type);

    case _tokentype.types._yield:
      if (this.inGenerator) this.unexpected();

    case _tokentype.types._do:
      if (this.options.features["es7.doExpressions"]) {
        var _node = this.startNode();
        this.next();
        _node.body = this.parseBlock();
        return this.finishNode(_node, "DoExpression");
      }

    case _tokentype.types.name:
      var start = this.markPosition();
      node = this.startNode();
      var id = this.parseIdent(this.type !== _tokentype.types.name);

      //
      if (this.options.features["es7.asyncFunctions"]) {
        // async functions!
        if (id.name === "async") {
          // arrow functions
          if (this.type === _tokentype.types.parenL) {
            var expr = this.parseParenAndDistinguishExpression(start, true, true);
            if (expr && expr.type === "ArrowFunctionExpression") {
              return expr;
            } else {
              node.callee = id;
              if (!expr) {
                node.arguments = [];
              } else if (expr.type === "SequenceExpression") {
                node.arguments = expr.expressions;
              } else {
                node.arguments = [expr];
              }
              return this.parseSubscripts(this.finishNode(node, "CallExpression"), start);
            }
          } else if (this.type === _tokentype.types.name) {
            id = this.parseIdent();
            this.expect(_tokentype.types.arrow);
            return this.parseArrowExpression(node, [id], true);
          }

          // normal functions
          if (this.type === _tokentype.types._function && !this.canInsertSemicolon()) {
            this.next();
            return this.parseFunction(node, false, false, true);
          }
        } else if (id.name === "await") {
          if (this.inAsync) return this.parseAwait(node);
        }
      }
      //

      if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow)) return this.parseArrowExpression(this.startNodeAt(start), [id]);
      return id;

    case _tokentype.types.regexp:
      var value = this.value;
      node = this.parseLiteral(value.value);
      node.regex = { pattern: value.pattern, flags: value.flags };
      return node;

    case _tokentype.types.num:case _tokentype.types.string:
      return this.parseLiteral(this.value);

    case _tokentype.types._null:case _tokentype.types._true:case _tokentype.types._false:
      node = this.startNode();
      node.value = this.type === _tokentype.types._null ? null : this.type === _tokentype.types._true;
      node.raw = this.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");

    case _tokentype.types.parenL:
      return this.parseParenAndDistinguishExpression(null, null, canBeArrow);

    case _tokentype.types.bracketL:
      node = this.startNode();
      this.next();
      // check whether this is array comprehension or regular array
      if ((this.options.ecmaVersion >= 7 || this.options.features["es7.comprehensions"]) && this.type === _tokentype.types._for) {
        return this.parseComprehension(node, false);
      }
      node.elements = this.parseExprList(_tokentype.types.bracketR, true, true, refShorthandDefaultPos);
      return this.finishNode(node, "ArrayExpression");

    case _tokentype.types.braceL:
      return this.parseObj(false, refShorthandDefaultPos);

    case _tokentype.types._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, false);

    case _tokentype.types.at:
      this.parseDecorators();

    case _tokentype.types._class:
      node = this.startNode();
      this.takeDecorators(node);
      return this.parseClass(node, false);

    case _tokentype.types._new:
      return this.parseNew();

    case _tokentype.types.backQuote:
      return this.parseTemplate();

    default:
      this.unexpected();
  }
};

pp.parseLiteral = function (value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  this.next();
  return this.finishNode(node, "Literal");
};

pp.parseParenExpression = function () {
  this.expect(_tokentype.types.parenL);
  var val = this.parseExpression();
  this.expect(_tokentype.types.parenR);
  return val;
};

pp.parseParenAndDistinguishExpression = function (start, isAsync, canBeArrow) {
  start = start || this.markPosition();
  var val = undefined;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    if ((this.options.features["es7.comprehensions"] || this.options.ecmaVersion >= 7) && this.type === _tokentype.types._for) {
      return this.parseComprehension(this.startNodeAt(start), true);
    }

    var innerStart = this.markPosition(),
        exprList = [],
        first = true;
    var refShorthandDefaultPos = { start: 0 },
        spreadStart = undefined,
        innerParenStart = undefined;
    while (this.type !== _tokentype.types.parenR) {
      first ? first = false : this.expect(_tokentype.types.comma);
      if (this.type === _tokentype.types.ellipsis) {
        var spreadNodeStart = this.markPosition();
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRest(), spreadNodeStart));
        break;
      } else {
        if (this.type === _tokentype.types.parenL && !innerParenStart) {
          innerParenStart = this.start;
        }
        exprList.push(this.parseMaybeAssign(false, refShorthandDefaultPos, this.parseParenItem));
      }
    }
    var innerEnd = this.markPosition();
    this.expect(_tokentype.types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow)) {
      if (innerParenStart) this.unexpected(innerParenStart);
      return this.parseParenArrowList(start, exprList, isAsync);
    }

    if (!exprList.length) {
      if (isAsync) {
        return;
      } else {
        this.unexpected(this.lastTokStart);
      }
    }
    if (spreadStart) this.unexpected(spreadStart);
    if (refShorthandDefaultPos.start) this.unexpected(refShorthandDefaultPos.start);

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStart);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEnd);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(start);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression");
  } else {
    val.parenthesizedExpression = true;
    return val;
  }
};

pp.parseParenArrowList = function (start, exprList, isAsync) {
  return this.parseArrowExpression(this.startNodeAt(start), exprList, isAsync);
};

pp.parseParenItem = function (node, start) {
  return node;
};

// New's precedence is slightly tricky. It must allow its argument
// to be a `[]` or dot subscript expression, but not a call — at
// least, not without wrapping it in parentheses. Thus, it uses the

var empty = [];

pp.parseNew = function () {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(_tokentype.types.dot)) {
    node.meta = meta;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target") this.raise(node.property.start, "The only valid meta property for new is new.target");
    return this.finishNode(node, "MetaProperty");
  }
  var start = this.markPosition();
  node.callee = this.parseSubscripts(this.parseExprAtom(), start, true);
  if (this.eat(_tokentype.types.parenL)) node.arguments = this.parseExprList(_tokentype.types.parenR, this.options.features["es7.trailingFunctionCommas"]);else node.arguments = empty;
  return this.finishNode(node, "NewExpression");
};

// Parse template expression.

pp.parseTemplateElement = function () {
  var elem = this.startNode();
  elem.value = {
    raw: this.input.slice(this.start, this.end),
    cooked: this.value
  };
  this.next();
  elem.tail = this.type === _tokentype.types.backQuote;
  return this.finishNode(elem, "TemplateElement");
};

pp.parseTemplate = function () {
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement();
  node.quasis = [curElt];
  while (!curElt.tail) {
    this.expect(_tokentype.types.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(_tokentype.types.braceR);
    node.quasis.push(curElt = this.parseTemplateElement());
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
};

// Parse an object literal or binding pattern.

pp.parseObj = function (isPattern, refShorthandDefaultPos) {
  var node = this.startNode(),
      first = true,
      propHash = {};
  node.properties = [];
  var decorators = [];
  this.next();
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;
    while (this.type === _tokentype.types.at) {
      decorators.push(this.parseDecorator());
    }
    var prop = this.startNode(),
        isGenerator = false,
        isAsync = false,
        _start2 = undefined;
    if (decorators.length) {
      prop.decorators = decorators;
      decorators = [];
    }
    if (this.options.features["es7.objectRestSpread"] && this.type === _tokentype.types.ellipsis) {
      prop = this.parseSpread();
      prop.type = "SpreadProperty";
      node.properties.push(prop);
      continue;
    }
    if (this.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refShorthandDefaultPos) _start2 = this.markPosition();
      if (!isPattern) isGenerator = this.eat(_tokentype.types.star);
    }
    if (this.options.features["es7.asyncFunctions"] && this.isContextual("async")) {
      if (isGenerator || isPattern) this.unexpected();
      var asyncId = this.parseIdent();
      if (this.type === _tokentype.types.colon || this.type === _tokentype.types.parenL) {
        prop.key = asyncId;
      } else {
        isAsync = true;
        this.parsePropertyName(prop);
      }
    } else {
      this.parsePropertyName(prop);
    }
    this.parseObjPropValue(prop, _start2, isGenerator, isAsync, isPattern, refShorthandDefaultPos);
    this.checkPropClash(prop, propHash);
    node.properties.push(this.finishNode(prop, "Property"));
  }
  if (decorators.length) {
    this.raise(this.start, "You have trailing decorators with no property");
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
};

pp.parseObjPropValue = function (prop, start, isGenerator, isAsync, isPattern, refShorthandDefaultPos) {
  if (this.eat(_tokentype.types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault() : this.parseMaybeAssign(false, refShorthandDefaultPos);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === _tokentype.types.parenL) {
    if (isPattern) this.unexpected();
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type != _tokentype.types.comma && this.type != _tokentype.types.braceR)) {
    if (isGenerator || isAsync || isPattern) this.unexpected();
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    prop.kind = "init";
    if (isPattern) {
      if (this.isKeyword(prop.key.name) || this.strict && (_identifier.reservedWords.strictBind(prop.key.name) || _identifier.reservedWords.strict(prop.key.name)) || !this.options.allowReserved && this.isReservedWord(prop.key.name)) this.raise(prop.key.start, "Binding " + prop.key.name);
      prop.value = this.parseMaybeDefault(start, prop.key);
    } else if (this.type === _tokentype.types.eq && refShorthandDefaultPos) {
      if (!refShorthandDefaultPos.start) refShorthandDefaultPos.start = this.start;
      prop.value = this.parseMaybeDefault(start, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else this.unexpected();
};

pp.parsePropertyName = function (prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(_tokentype.types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(_tokentype.types.bracketR);
      return;
    } else {
      prop.computed = false;
    }
  }
  prop.key = this.type === _tokentype.types.num || this.type === _tokentype.types.string ? this.parseExprAtom() : this.parseIdent(true);
};

// Initialize empty function node.

pp.initFunction = function (node, isAsync) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
  if (this.options.features["es7.asyncFunctions"]) {
    node.async = !!isAsync;
  }
};

// Parse object or class method.

pp.parseMethod = function (isGenerator, isAsync) {
  var node = this.startNode();
  this.initFunction(node, isAsync);
  this.expect(_tokentype.types.parenL);
  node.params = this.parseBindingList(_tokentype.types.parenR, false, this.options.features["es7.trailingFunctionCommas"]);
  if (this.options.ecmaVersion >= 6) {
    node.generator = isGenerator;
  }
  this.parseFunctionBody(node);
  return this.finishNode(node, "FunctionExpression");
};

// Parse arrow function expression with given parameters.

pp.parseArrowExpression = function (node, params, isAsync) {
  this.initFunction(node, isAsync);
  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);
  return this.finishNode(node, "ArrowFunctionExpression");
};

// Parse function body and check parameters.

pp.parseFunctionBody = function (node, allowExpression) {
  var isExpression = allowExpression && this.type !== _tokentype.types.braceL;

  var oldInAsync = this.inAsync;
  this.inAsync = node.async;
  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
  } else {
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldInFunc = this.inFunction,
        oldInGen = this.inGenerator,
        oldLabels = this.labels;
    this.inFunction = true;this.inGenerator = node.generator;this.labels = [];
    node.body = this.parseBlock(true);
    node.expression = false;
    this.inFunction = oldInFunc;this.inGenerator = oldInGen;this.labels = oldLabels;
  }
  this.inAsync = oldInAsync;

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  if (this.strict || !isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) {
    var nameHash = {},
        oldStrict = this.strict;
    this.strict = true;
    if (node.id) this.checkLVal(node.id, true);
    for (var i = 0; i < node.params.length; i++) {
      this.checkLVal(node.params[i], true, nameHash);
    }this.strict = oldStrict;
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp.parseExprList = function (close, allowTrailingComma, allowEmpty, refShorthandDefaultPos) {
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) break;
    } else first = false;

    if (allowEmpty && this.type === _tokentype.types.comma) {
      elts.push(null);
    } else {
      if (this.type === _tokentype.types.ellipsis) elts.push(this.parseSpread(refShorthandDefaultPos));else elts.push(this.parseMaybeAssign(false, refShorthandDefaultPos));
    }
  }
  return elts;
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp.parseIdent = function (liberal) {
  var node = this.startNode();
  if (liberal && this.options.allowReserved == "never") liberal = false;
  if (this.type === _tokentype.types.name) {
    if (!liberal && (!this.options.allowReserved && this.isReservedWord(this.value) || this.strict && _identifier.reservedWords.strict(this.value) && (this.options.ecmaVersion >= 6 || this.input.slice(this.start, this.end).indexOf("\\") == -1))) this.raise(this.start, "The keyword '" + this.value + "' is reserved");
    node.name = this.value;
  } else if (liberal && this.type.keyword) {
    node.name = this.type.keyword;
  } else {
    this.unexpected();
  }
  this.next();
  return this.finishNode(node, "Identifier");
};

// Parses await expression inside async function.

pp.parseAwait = function (node) {
  if (this.eat(_tokentype.types.semi) || this.canInsertSemicolon()) {
    this.unexpected();
  }
  node.all = this.eat(_tokentype.types.star);
  node.argument = this.parseMaybeUnary();
  return this.finishNode(node, "AwaitExpression");
};

// Parses yield expression inside generator.

pp.parseYield = function () {
  var node = this.startNode();
  this.next();
  if (this.type == _tokentype.types.semi || this.canInsertSemicolon() || this.type != _tokentype.types.star && !this.type.startsExpr) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(_tokentype.types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression");
};

// Parses array and generator comprehensions.

pp.parseComprehension = function (node, isGenerator) {
  node.blocks = [];
  while (this.type === _tokentype.types._for) {
    var block = this.startNode();
    this.next();
    this.expect(_tokentype.types.parenL);
    block.left = this.parseBindingAtom();
    this.checkLVal(block.left, true);
    this.expectContextual("of");
    block.right = this.parseExpression();
    this.expect(_tokentype.types.parenR);
    node.blocks.push(this.finishNode(block, "ComprehensionBlock"));
  }
  node.filter = this.eat(_tokentype.types._if) ? this.parseParenExpression() : null;
  node.body = this.parseExpression();
  this.expect(isGenerator ? _tokentype.types.parenR : _tokentype.types.bracketR);
  node.generator = isGenerator;
  return this.finishNode(node, "ComprehensionExpression");
};
},{"./identifier":4,"./state":12,"./tokentype":16,"./util":17}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

// Test whether a given character code starts an identifier.

exports.isIdentifierStart = isIdentifierStart;

// Test whether a given character is part of an identifier.

exports.isIdentifierChar = isIdentifierChar;
// This is a trick taken from Esprima. It turns out that, on
// non-Chrome browsers, to check whether a string is in a set, a
// predicate containing a big ugly `switch` statement is faster than
// a regular expression, and on Chrome the two are about on par.
// This function uses `eval` (non-lexical) to produce such a
// predicate from a space-separated string of words.
//
// It starts by sorting the words by length.

function makePredicate(words) {
  words = words.split(" ");
  return function (str) {
    return words.indexOf(str) >= 0;
  };
}

// Reserved word lists for various dialects of the language

var reservedWords = {
  3: makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile"),
  5: makePredicate("class enum extends super const export import"),
  6: makePredicate("enum await"),
  strict: makePredicate("implements interface let package private protected public static yield"),
  strictBind: makePredicate("eval arguments")
};

exports.reservedWords = reservedWords;
// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: makePredicate(ecma5AndLessKeywords),
  6: makePredicate(ecma5AndLessKeywords + " let const class extends export import yield super")
};

exports.keywords = keywords;
// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `tools/generate-identifier-regex.js`.

var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠ-ࢲऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞭꞰꞱꟷ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭟꭤꭥꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
var nonASCIIidentifierChars = "‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࣤ-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఃా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ഁ-ഃാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ංඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ູົຼ່-ໍ໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠐-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏ᦰ-ᧀᧈᧉ᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭ᳲ-᳴᳸᳹᷀-᷵᷼-᷿‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꘠-꘩꙯ꙴ-꙽ꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧꢀꢁꢴ-꣄꣐-꣙꣠-꣱꤀-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︭︳︴﹍-﹏０-９＿";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by tools/generate-identifier-regex.js
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 17, 26, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 99, 39, 9, 51, 157, 310, 10, 21, 11, 7, 153, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 98, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 26, 45, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 955, 52, 76, 44, 33, 24, 27, 35, 42, 34, 4, 0, 13, 47, 15, 3, 22, 0, 38, 17, 2, 24, 133, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 32, 4, 287, 47, 21, 1, 2, 0, 185, 46, 82, 47, 21, 0, 60, 42, 502, 63, 32, 0, 449, 56, 1288, 920, 104, 110, 2962, 1070, 13266, 568, 8, 30, 114, 29, 19, 47, 17, 3, 32, 20, 6, 18, 881, 68, 12, 0, 67, 12, 16481, 1, 3071, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 4149, 196, 1340, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42710, 42, 4148, 12, 221, 16355, 541];
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 1306, 2, 54, 14, 32, 9, 16, 3, 46, 10, 54, 9, 7, 2, 37, 13, 2, 9, 52, 0, 13, 2, 49, 13, 16, 9, 83, 11, 168, 11, 6, 9, 8, 2, 57, 0, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 316, 19, 13, 9, 214, 6, 3, 8, 112, 16, 16, 9, 82, 12, 9, 9, 535, 9, 20855, 9, 135, 4, 60, 6, 26, 9, 1016, 45, 17, 3, 19723, 1, 5319, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 4305, 6, 792618, 239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 65536;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) return false;
    pos += set[i + 1];
    if (pos >= code) return true;
  }
}
function isIdentifierStart(code, astral) {
  if (code < 65) return code === 36;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  if (code <= 65535) return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
  if (astral === false) return false;
  return isInAstralSet(code, astralIdentifierStartCodes);
}

function isIdentifierChar(code, astral) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  if (code <= 65535) return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
  if (astral === false) return false;
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
}
},{}],5:[function(require,module,exports){
// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/marijnh/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/marijnh/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

"use strict";

exports.__esModule = true;

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

exports.parse = parse;

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

exports.parseExpressionAt = parseExpressionAt;

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenize` export provides an interface to the tokenizer.
// Because the tokenizer is optimized for being efficiently used by
// the Acorn parser itself, this interface is somewhat crude and not
// very modular.

exports.tokenizer = tokenizer;

var _state = require("./state");

var _options = require("./options");

require("./parseutil");

require("./statement");

require("./lval");

require("./expression");

require("./lookahead");

exports.Parser = _state.Parser;
exports.plugins = _state.plugins;
exports.defaultOptions = _options.defaultOptions;

var _location = require("./location");

exports.SourceLocation = _location.SourceLocation;
exports.getLineInfo = _location.getLineInfo;

var _node = require("./node");

exports.Node = _node.Node;

var _tokentype = require("./tokentype");

exports.TokenType = _tokentype.TokenType;
exports.tokTypes = _tokentype.types;

var _tokencontext = require("./tokencontext");

exports.TokContext = _tokencontext.TokContext;
exports.tokContexts = _tokencontext.types;

var _identifier = require("./identifier");

exports.isIdentifierChar = _identifier.isIdentifierChar;
exports.isIdentifierStart = _identifier.isIdentifierStart;

var _tokenize = require("./tokenize");

exports.Token = _tokenize.Token;

var _whitespace = require("./whitespace");

exports.isNewLine = _whitespace.isNewLine;
exports.lineBreak = _whitespace.lineBreak;
exports.lineBreakG = _whitespace.lineBreakG;
var version = "1.0.0";exports.version = version;

function parse(input, options) {
  var p = parser(options, input);
  var startPos = p.options.locations ? [p.pos, p.curPosition()] : p.pos;
  p.nextToken();
  return p.parseTopLevel(p.options.program || p.startNodeAt(startPos));
}

function parseExpressionAt(input, pos, options) {
  var p = parser(options, input, pos);
  p.nextToken();
  return p.parseExpression();
}

function tokenizer(input, options) {
  return parser(options, input);
}

function parser(options, input) {
  return new _state.Parser((0, _options.getOptions)(options), String(input));
}
},{"./expression":3,"./identifier":4,"./location":6,"./lookahead":7,"./lval":8,"./node":9,"./options":10,"./parseutil":11,"./state":12,"./statement":13,"./tokencontext":14,"./tokenize":15,"./tokentype":16,"./whitespace":18}],6:[function(require,module,exports){
"use strict";

exports.__esModule = true;

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

exports.getLineInfo = getLineInfo;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _state = require("./state");

var _whitespace = require("./whitespace");

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = (function () {
  function Position(line, col) {
    _classCallCheck(this, Position);

    this.line = line;
    this.column = col;
  }

  Position.prototype.offset = function offset(n) {
    return new Position(this.line, this.column + n);
  };

  return Position;
})();

exports.Position = Position;

var SourceLocation = function SourceLocation(p, start, end) {
  _classCallCheck(this, SourceLocation);

  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) this.source = p.sourceFile;
};

exports.SourceLocation = SourceLocation;

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    _whitespace.lineBreakG.lastIndex = cur;
    var match = _whitespace.lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur);
    }
  }
}

var pp = _state.Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp.raise = function (pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos;err.loc = loc;err.raisedAt = this.pos;
  throw err;
};

pp.curPosition = function () {
  return new Position(this.curLine, this.pos - this.lineStart);
};

pp.markPosition = function () {
  return this.options.locations ? [this.start, this.startLoc] : this.start;
};
},{"./state":12,"./whitespace":18}],7:[function(require,module,exports){
"use strict";

var _state = require("./state");

var pp = _state.Parser.prototype;

var STATE_KEYS = ["lastTokStartLoc", "lastTokEndLoc", "lastTokStart", "lastTokEnd", "lineStart", "startLoc", "endLoc", "start", "pos", "end", "type", "value", "exprAllowed", "potentialArrowAt", "currLine", "input"];

pp.getState = function () {
  var state = {};
  for (var i = 0; i < STATE_KEYS.length; i++) {
    var key = STATE_KEYS[i];
    state[key] = this[key];
  }
  state.context = this.context.slice();
  return state;
};

pp.lookahead = function () {
  var old = this.getState();
  this.isLookahead = true;
  this.next();
  this.isLookahead = false;
  var curr = this.getState();
  for (var key in old) this[key] = old[key];
  return curr;
};
},{"./state":12}],8:[function(require,module,exports){
"use strict";

var _tokentype = require("./tokentype");

var _state = require("./state");

var _identifier = require("./identifier");

var _util = require("./util");

var pp = _state.Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp.toAssignable = function (node, isBinding) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
        break;

      case "ObjectExpression":
        node.type = "ObjectPattern";
        for (var i = 0; i < node.properties.length; i++) {
          var prop = node.properties[i];
          if (prop.type === "SpreadProperty") continue;
          if (prop.kind !== "init") this.raise(prop.key.start, "Object pattern can't contain getter or setter");
          this.toAssignable(prop.value, isBinding);
        }
        break;

      case "ArrayExpression":
        node.type = "ArrayPattern";
        this.toAssignableList(node.elements, isBinding);
        break;

      case "AssignmentExpression":
        if (node.operator === "=") {
          node.type = "AssignmentPattern";
        } else {
          this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        }
        break;

      case "MemberExpression":
        if (!isBinding) break;

      default:
        this.raise(node.start, "Assigning to rvalue");
    }
  }
  return node;
};

// Convert list of expression atoms to binding list.

pp.toAssignableList = function (exprList, isBinding) {
  var end = exprList.length;
  if (end) {
    var last = exprList[end - 1];
    if (last && last.type == "RestElement") {
      --end;
    } else if (last && last.type == "SpreadElement") {
      last.type = "RestElement";
      var arg = last.argument;
      this.toAssignable(arg, isBinding);
      if (arg.type !== "Identifier" && arg.type !== "MemberExpression" && arg.type !== "ArrayPattern") this.unexpected(arg.start);
      --end;
    }
  }
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) this.toAssignable(elt, isBinding);
  }
  return exprList;
};

// Parses spread element.

pp.parseSpread = function (refShorthandDefaultPos) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(refShorthandDefaultPos);
  return this.finishNode(node, "SpreadElement");
};

pp.parseRest = function () {
  var node = this.startNode();
  this.next();
  node.argument = this.type === _tokentype.types.name || this.type === _tokentype.types.bracketL ? this.parseBindingAtom() : this.unexpected();
  return this.finishNode(node, "RestElement");
};

// Parses lvalue (assignable) atom.

pp.parseBindingAtom = function () {
  if (this.options.ecmaVersion < 6) return this.parseIdent();
  switch (this.type) {
    case _tokentype.types.name:
      return this.parseIdent();

    case _tokentype.types.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(_tokentype.types.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern");

    case _tokentype.types.braceL:
      return this.parseObj(true);

    default:
      this.unexpected();
  }
};

pp.parseBindingList = function (close, allowEmpty, allowTrailingComma) {
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (first) first = false;else this.expect(_tokentype.types.comma);
    if (allowEmpty && this.type === _tokentype.types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break;
    } else if (this.type === _tokentype.types.ellipsis) {
      elts.push(this.parseAssignableListItemTypes(this.parseRest()));
      this.expect(close);
      break;
    } else {
      var left = this.parseMaybeDefault();
      this.parseAssignableListItemTypes(left);
      elts.push(this.parseMaybeDefault(null, left));
    }
  }
  return elts;
};

pp.parseAssignableListItemTypes = function (param) {
  return param;
};

// Parses assignment pattern around given atom if possible.

pp.parseMaybeDefault = function (startPos, left) {
  startPos = startPos || this.markPosition();
  left = left || this.parseBindingAtom();
  if (!this.eat(_tokentype.types.eq)) return left;
  var node = this.startNodeAt(startPos);
  node.operator = "=";
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern");
};

// Verify that a node is an lval — something that can be assigned
// to.

pp.checkLVal = function (expr, isBinding, checkClashes) {
  switch (expr.type) {
    case "Identifier":
      if (this.strict && (_identifier.reservedWords.strictBind(expr.name) || _identifier.reservedWords.strict(expr.name))) this.raise(expr.start, (isBinding ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
      if (checkClashes) {
        if ((0, _util.has)(checkClashes, expr.name)) this.raise(expr.start, "Argument name clash in strict mode");
        checkClashes[expr.name] = true;
      }
      break;

    case "MemberExpression":
      if (isBinding) this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " member expression");
      break;

    case "ObjectPattern":
      for (var i = 0; i < expr.properties.length; i++) {
        var prop = expr.properties[i];
        if (prop.type === "Property") prop = prop.value;
        this.checkLVal(prop, isBinding, checkClashes);
      }
      break;

    case "ArrayPattern":
      for (var i = 0; i < expr.elements.length; i++) {
        var elem = expr.elements[i];
        if (elem) this.checkLVal(elem, isBinding, checkClashes);
      }
      break;

    case "AssignmentPattern":
      this.checkLVal(expr.left, isBinding, checkClashes);
      break;

    case "SpreadProperty":
    case "RestElement":
      this.checkLVal(expr.argument, isBinding, checkClashes);
      break;

    default:
      this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " rvalue");
  }
};
},{"./identifier":4,"./state":12,"./tokentype":16,"./util":17}],9:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _state = require("./state");

var _location = require("./location");

// Start an AST node, attaching a start offset.

var pp = _state.Parser.prototype;

var Node = function Node() {
  _classCallCheck(this, Node);
};

exports.Node = Node;

pp.startNode = function () {
  var node = new Node();
  node.start = this.start;
  if (this.options.locations) node.loc = new _location.SourceLocation(this, this.startLoc);
  if (this.options.directSourceFile) node.sourceFile = this.options.directSourceFile;
  if (this.options.ranges) node.range = [this.start, 0];
  return node;
};

pp.startNodeAt = function (pos) {
  var node = new Node(),
      start = pos;
  if (this.options.locations) {
    node.loc = new _location.SourceLocation(this, start[1]);
    start = pos[0];
  }
  node.start = start;
  if (this.options.directSourceFile) node.sourceFile = this.options.directSourceFile;
  if (this.options.ranges) node.range = [start, 0];
  return node;
};

// Finish an AST node, adding `type` and `end` properties.

pp.finishNode = function (node, type) {
  node.type = type;
  node.end = this.lastTokEnd;
  if (this.options.locations) node.loc.end = this.lastTokEndLoc;
  if (this.options.ranges) node.range[1] = this.lastTokEnd;
  return node;
};

// Finish node at given position

pp.finishNodeAt = function (node, type, pos) {
  if (this.options.locations) {
    node.loc.end = pos[1];pos = pos[0];
  }
  node.type = type;
  node.end = pos;
  if (this.options.ranges) node.range[1] = pos;
  return node;
};
},{"./location":6,"./state":12}],10:[function(require,module,exports){
"use strict";

exports.__esModule = true;

// Interpret and default an options object

exports.getOptions = getOptions;

var _util = require("./util");

var _location = require("./location");

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, or 5, or 6. This influences support for strict
  // mode, the set of reserved words, support for getters and
  // setters and other features.
  ecmaVersion: 5,
  // Source type ("script" or "module") for different semantics
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // th position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are not enforced. Disable
  // `allowReserved` to enforce them. When this option has the
  // value "never", reserved words and keywords can also not be
  // used as property names.
  allowReserved: true,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokenize() returns. Note that you are not
  // allowed to call the parser from the callback—that will
  // corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false,
  plugins: {},
  // Babel-specific options
  features: {},
  strictMode: null
};exports.defaultOptions = defaultOptions;

function getOptions(opts) {
  var options = {};
  for (var opt in defaultOptions) {
    options[opt] = opts && (0, _util.has)(opts, opt) ? opts[opt] : defaultOptions[opt];
  }if ((0, _util.isArray)(options.onToken)) {
    (function () {
      var tokens = options.onToken;
      options.onToken = function (token) {
        return tokens.push(token);
      };
    })();
  }
  if ((0, _util.isArray)(options.onComment)) options.onComment = pushComment(options, options.onComment);

  return options;
}

function pushComment(options, array) {
  return function (block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations) comment.loc = new _location.SourceLocation(this, startLoc, endLoc);
    if (options.ranges) comment.range = [start, end];
    array.push(comment);
  };
}
},{"./location":6,"./util":17}],11:[function(require,module,exports){
"use strict";

var _tokentype = require("./tokentype");

var _state = require("./state");

var _whitespace = require("./whitespace");

var pp = _state.Parser.prototype;

// ## Parser utilities

// Test whether a statement node is the string literal `"use strict"`.

pp.isUseStrict = function (stmt) {
  return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function (type) {
  if (this.type === type) {
    this.next();
    return true;
  } else {
    return false;
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function (name) {
  return this.type === _tokentype.types.name && this.value === name;
};

// Consumes contextual keyword if possible.

pp.eatContextual = function (name) {
  return this.value === name && this.eat(_tokentype.types.name);
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function (name) {
  if (!this.eatContextual(name)) this.unexpected();
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function () {
  return this.type === _tokentype.types.eof || this.type === _tokentype.types.braceR || _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};

pp.insertSemicolon = function () {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon) this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
    return true;
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function () {
  if (!this.eat(_tokentype.types.semi) && !this.insertSemicolon()) this.unexpected();
};

pp.afterTrailingComma = function (tokType) {
  if (this.type == tokType) {
    if (this.options.onTrailingComma) this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
    this.next();
    return true;
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function (type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function (pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};
},{"./state":12,"./tokentype":16,"./whitespace":18}],12:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Parser = Parser;

var _identifier = require("./identifier");

var _tokentype = require("./tokentype");

function Parser(options, input, startPos) {
  this.options = options;
  this.loadPlugins(this.options.plugins);
  this.sourceFile = this.options.sourceFile || null;
  this.isKeyword = _identifier.keywords[this.options.ecmaVersion >= 6 ? 6 : 5];
  this.isReservedWord = _identifier.reservedWords[this.options.ecmaVersion];
  this.input = input;

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos));
    this.curLine = this.input.slice(0, this.lineStart).split(_tokentype.lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = _tokentype.types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = null;

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = this.options.sourceType === "module";
  this.strict = this.options.strictMode === false ? false : this.inModule;

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Flags to track whether we are in a function, a generator.
  this.inFunction = this.inGenerator = false;
  // Labels in scope.
  this.labels = [];

  this.decorators = [];

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && this.options.allowHashBang && this.input.slice(0, 2) === "#!") this.skipLineComment(2);
}

Parser.prototype.extend = function (name, f) {
  this[name] = f(this[name]);
};

// Registered plugins

var plugins = {};

exports.plugins = plugins;
Parser.prototype.loadPlugins = function (plugins) {
  for (var _name in plugins) {
    var plugin = exports.plugins[_name];
    if (!plugin) throw new Error("Plugin '" + _name + "' not found");
    plugin(this, plugins[_name]);
  }
};
},{"./identifier":4,"./tokentype":16}],13:[function(require,module,exports){
"use strict";

var _tokentype = require("./tokentype");

var _state = require("./state");

var _whitespace = require("./whitespace");

var pp = _state.Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp.parseTopLevel = function (node) {
  var first = true;
  if (!node.body) node.body = [];
  while (this.type !== _tokentype.types.eof) {
    var stmt = this.parseStatement(true, true);
    node.body.push(stmt);
    if (first && this.isUseStrict(stmt)) this.setStrict(true);
    first = false;
  }
  this.next();
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program");
};

var loopLabel = { kind: "loop" },
    switchLabel = { kind: "switch" };

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp.parseStatement = function (declaration, topLevel) {
  if (this.type === _tokentype.types.at) {
    this.parseDecorators(true);
  }

  var starttype = this.type,
      node = this.startNode();

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
    case _tokentype.types._break:case _tokentype.types._continue:
      return this.parseBreakContinueStatement(node, starttype.keyword);
    case _tokentype.types._debugger:
      return this.parseDebuggerStatement(node);
    case _tokentype.types._do:
      return this.parseDoStatement(node);
    case _tokentype.types._for:
      return this.parseForStatement(node);
    case _tokentype.types._function:
      if (!declaration && this.options.ecmaVersion >= 6) this.unexpected();
      return this.parseFunctionStatement(node);

    case _tokentype.types._class:
      if (!declaration) this.unexpected();
      this.takeDecorators(node);
      return this.parseClass(node, true);

    case _tokentype.types._if:
      return this.parseIfStatement(node);
    case _tokentype.types._return:
      return this.parseReturnStatement(node);
    case _tokentype.types._switch:
      return this.parseSwitchStatement(node);
    case _tokentype.types._throw:
      return this.parseThrowStatement(node);
    case _tokentype.types._try:
      return this.parseTryStatement(node);
    case _tokentype.types._let:case _tokentype.types._const:
      if (!declaration) this.unexpected(); // NOTE: falls through to _var
    case _tokentype.types._var:
      return this.parseVarStatement(node, starttype);
    case _tokentype.types._while:
      return this.parseWhileStatement(node);
    case _tokentype.types._with:
      return this.parseWithStatement(node);
    case _tokentype.types.braceL:
      return this.parseBlock();
    case _tokentype.types.semi:
      return this.parseEmptyStatement(node);
    case _tokentype.types._export:
    case _tokentype.types._import:
      if (!this.options.allowImportExportEverywhere) {
        if (!topLevel) this.raise(this.start, "'import' and 'export' may only appear at the top level");
        if (!this.inModule) this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
      }
      return starttype === _tokentype.types._import ? this.parseImport(node) : this.parseExport(node);

    case _tokentype.types.name:
      if (this.options.features["es7.asyncFunctions"] && this.value === "async" && this.lookahead().type === _tokentype.types._function) {
        this.next();
        this.expect(_tokentype.types._function);
        return this.parseFunction(node, true, false, true);
      }

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
    default:
      var maybeName = this.value,
          expr = this.parseExpression();
      if (starttype === _tokentype.types.name && expr.type === "Identifier" && this.eat(_tokentype.types.colon)) return this.parseLabeledStatement(node, maybeName, expr);else return this.parseExpressionStatement(node, expr);
  }
};

pp.takeDecorators = function (node) {
  if (this.decorators.length) {
    node.decorators = this.decorators;
    this.decorators = [];
  }
};

pp.parseDecorators = function (allowExport) {
  while (this.type === _tokentype.types.at) {
    this.decorators.push(this.parseDecorator());
  }

  if (allowExport && this.type === _tokentype.types._export) {
    return;
  }

  if (this.type !== _tokentype.types._class) {
    this.raise(this.start, "Leading decorators must be attached to a class declaration");
  }
};

pp.parseDecorator = function (allowExport) {
  if (!this.options.features["es7.decorators"]) {
    this.unexpected();
  }
  var node = this.startNode();
  this.next();
  node.expression = this.parseMaybeAssign();
  return this.finishNode(node, "Decorator");
};

pp.parseBreakContinueStatement = function (node, keyword) {
  var isBreak = keyword == "break";
  this.next();
  if (this.eat(_tokentype.types.semi) || this.insertSemicolon()) node.label = null;else if (this.type !== _tokentype.types.name) this.unexpected();else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  for (var i = 0; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
      if (node.label && isBreak) break;
    }
  }
  if (i === this.labels.length) this.raise(node.start, "Unsyntactic " + keyword);
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};

pp.parseDebuggerStatement = function (node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement");
};

pp.parseDoStatement = function (node) {
  var start = this.markPosition();
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  if (this.options.features["es7.doExpressions"] && this.type !== _tokentype.types._while) {
    var container = this.startNodeAt(start);
    container.expression = this.finishNode(node, "DoExpression");
    this.semicolon();
    return this.finishNode(container, "ExpressionStatement");
  }
  this.expect(_tokentype.types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6) this.eat(_tokentype.types.semi);else this.semicolon();
  return this.finishNode(node, "DoWhileStatement");
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp.parseForStatement = function (node) {
  this.next();
  this.labels.push(loopLabel);
  this.expect(_tokentype.types.parenL);
  if (this.type === _tokentype.types.semi) return this.parseFor(node, null);
  if (this.type === _tokentype.types._var || this.type === _tokentype.types._let || this.type === _tokentype.types._const) {
    var _init = this.startNode(),
        varKind = this.type;
    this.next();
    this.parseVar(_init, true, varKind);
    this.finishNode(_init, "VariableDeclaration");
    if ((this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && _init.declarations.length === 1 && !(varKind !== _tokentype.types._var && _init.declarations[0].init)) return this.parseForIn(node, _init);
    return this.parseFor(node, _init);
  }
  var refShorthandDefaultPos = { start: 0 };
  var init = this.parseExpression(true, refShorthandDefaultPos);
  if (this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) {
    this.toAssignable(init);
    this.checkLVal(init);
    return this.parseForIn(node, init);
  } else if (refShorthandDefaultPos.start) {
    this.unexpected(refShorthandDefaultPos.start);
  }
  return this.parseFor(node, init);
};

pp.parseFunctionStatement = function (node) {
  this.next();
  return this.parseFunction(node, true);
};

pp.parseIfStatement = function (node) {
  this.next();
  node.test = this.parseParenExpression();
  node.consequent = this.parseStatement(false);
  node.alternate = this.eat(_tokentype.types._else) ? this.parseStatement(false) : null;
  return this.finishNode(node, "IfStatement");
};

pp.parseReturnStatement = function (node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction) this.raise(this.start, "'return' outside of function");
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(_tokentype.types.semi) || this.insertSemicolon()) node.argument = null;else {
    node.argument = this.parseExpression();this.semicolon();
  }
  return this.finishNode(node, "ReturnStatement");
};

pp.parseSwitchStatement = function (node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(_tokentype.types.braceL);
  this.labels.push(switchLabel);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  for (var cur, sawDefault; this.type != _tokentype.types.braceR;) {
    if (this.type === _tokentype.types._case || this.type === _tokentype.types._default) {
      var isCase = this.type === _tokentype.types._case;
      if (cur) this.finishNode(cur, "SwitchCase");
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) this.raise(this.lastTokStart, "Multiple default clauses");
        sawDefault = true;
        cur.test = null;
      }
      this.expect(_tokentype.types.colon);
    } else {
      if (!cur) this.unexpected();
      cur.consequent.push(this.parseStatement(true));
    }
  }
  if (cur) this.finishNode(cur, "SwitchCase");
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement");
};

pp.parseThrowStatement = function (node) {
  this.next();
  if (_whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) this.raise(this.lastTokEnd, "Illegal newline after throw");
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement");
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp.parseTryStatement = function (node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === _tokentype.types._catch) {
    var clause = this.startNode();
    this.next();
    this.expect(_tokentype.types.parenL);
    clause.param = this.parseBindingAtom();
    this.checkLVal(clause.param, true);
    this.expect(_tokentype.types.parenR);
    clause.guard = null;
    clause.body = this.parseBlock();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.guardedHandlers = empty;
  node.finalizer = this.eat(_tokentype.types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer) this.raise(node.start, "Missing catch or finally clause");
  return this.finishNode(node, "TryStatement");
};

pp.parseVarStatement = function (node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};

pp.parseWhileStatement = function (node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "WhileStatement");
};

pp.parseWithStatement = function (node) {
  if (this.strict) this.raise(this.start, "'with' in strict mode");
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement(false);
  return this.finishNode(node, "WithStatement");
};

pp.parseEmptyStatement = function (node) {
  this.next();
  return this.finishNode(node, "EmptyStatement");
};

pp.parseLabeledStatement = function (node, maybeName, expr) {
  for (var i = 0; i < this.labels.length; ++i) {
    if (this.labels[i].name === maybeName) this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  }var kind = this.type.isLoop ? "loop" : this.type === _tokentype.types._switch ? "switch" : null;
  this.labels.push({ name: maybeName, kind: kind });
  node.body = this.parseStatement(true);
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement");
};

pp.parseExpressionStatement = function (node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement");
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp.parseBlock = function (allowStrict) {
  var node = this.startNode(),
      first = true,
      oldStrict = undefined;
  node.body = [];
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    var stmt = this.parseStatement(true);
    node.body.push(stmt);
    if (first && allowStrict && this.isUseStrict(stmt)) {
      oldStrict = this.strict;
      this.setStrict(this.strict = true);
    }
    first = false;
  }
  if (oldStrict === false) this.setStrict(false);
  return this.finishNode(node, "BlockStatement");
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp.parseFor = function (node, init) {
  node.init = init;
  this.expect(_tokentype.types.semi);
  node.test = this.type === _tokentype.types.semi ? null : this.parseExpression();
  this.expect(_tokentype.types.semi);
  node.update = this.type === _tokentype.types.parenR ? null : this.parseExpression();
  this.expect(_tokentype.types.parenR);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "ForStatement");
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp.parseForIn = function (node, init) {
  var type = this.type === _tokentype.types._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.parseExpression();
  this.expect(_tokentype.types.parenR);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, type);
};

// Parse a list of variable declarations.

pp.parseVar = function (node, isFor, kind) {
  node.declarations = [];
  node.kind = kind.keyword;
  for (;;) {
    var decl = this.startNode();
    this.parseVarHead(decl);
    if (this.eat(_tokentype.types.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (kind === _tokentype.types._const && !(this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      this.unexpected();
    } else if (decl.id.type != "Identifier" && !(isFor && (this.type === _tokentype.types._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(_tokentype.types.comma)) break;
  }
  return node;
};

pp.parseVarHead = function (decl) {
  decl.id = this.parseBindingAtom();
  this.checkLVal(decl.id, true);
};

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

pp.parseFunction = function (node, isStatement, allowExpressionBody, isAsync) {
  this.initFunction(node, isAsync);
  if (this.options.ecmaVersion >= 6) node.generator = this.eat(_tokentype.types.star);
  if (isStatement || this.type === _tokentype.types.name) node.id = this.parseIdent();
  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody);
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

pp.parseFunctionParams = function (node) {
  this.expect(_tokentype.types.parenL);
  node.params = this.parseBindingList(_tokentype.types.parenR, false, this.options.features["es7.trailingFunctionCommas"]);
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp.parseClass = function (node, isStatement) {
  this.next();
  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  classBody.body = [];
  this.expect(_tokentype.types.braceL);
  var decorators = [];
  while (!this.eat(_tokentype.types.braceR)) {
    if (this.eat(_tokentype.types.semi)) continue;
    if (this.type === _tokentype.types.at) {
      decorators.push(this.parseDecorator());
      continue;
    }
    var method = this.startNode();
    if (decorators.length) {
      method.decorators = decorators;
      decorators = [];
    }
    var isGenerator = this.eat(_tokentype.types.star),
        isAsync = false;
    this.parsePropertyName(method);
    if (this.type !== _tokentype.types.parenL && !method.computed && method.key.type === "Identifier" && method.key.name === "static") {
      if (isGenerator) this.unexpected();
      method["static"] = true;
      isGenerator = this.eat(_tokentype.types.star);
      this.parsePropertyName(method);
    } else {
      method["static"] = false;
    }
    if (!isGenerator && method.key.type === "Identifier" && !method.computed && this.isClassProperty()) {
      classBody.body.push(this.parseClassProperty(method));
      continue;
    }
    if (this.options.features["es7.asyncFunctions"] && this.type !== _tokentype.types.parenL && !method.computed && method.key.type === "Identifier" && method.key.name === "async") {
      isAsync = true;
      this.parsePropertyName(method);
    }
    method.kind = "method";
    if (!method.computed && !isGenerator && !isAsync) {
      if (method.key.type === "Identifier") {
        if (this.type !== _tokentype.types.parenL && (method.key.name === "get" || method.key.name === "set")) {
          method.kind = method.key.name;
          this.parsePropertyName(method);
        } else if (!method["static"] && method.key.name === "constructor") {
          method.kind = "constructor";
        }
      } else if (!method["static"] && method.key.type === "Literal" && method.key.value === "constructor") {
        method.kind = "constructor";
      }
    }
    if (method.kind === "constructor" && method.decorators) {
      this.raise(method.start, "You can't attach decorators to a class constructor");
    }
    this.parseClassMethod(classBody, method, isGenerator, isAsync);
  }
  if (decorators.length) {
    this.raise(this.start, "You have trailing decorators with no method");
  }
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};

pp.isClassProperty = function () {
  return this.type === _tokentype.types.eq || (this.type === _tokentype.types.semi || this.canInsertSemicolon());
};

pp.parseClassProperty = function (node) {
  if (this.type === _tokentype.types.eq) {
    if (!this.options.features["es7.classProperties"]) this.unexpected();
    this.next();
    node.value = this.parseMaybeAssign();
  } else {
    node.value = null;
  }
  this.semicolon();
  return this.finishNode(node, "ClassProperty");
};

pp.parseClassMethod = function (classBody, method, isGenerator, isAsync) {
  method.value = this.parseMethod(isGenerator, isAsync);
  classBody.body.push(this.finishNode(method, "MethodDefinition"));
};

pp.parseClassId = function (node, isStatement) {
  node.id = this.type === _tokentype.types.name ? this.parseIdent() : isStatement ? this.unexpected() : null;
};

pp.parseClassSuper = function (node) {
  node.superClass = this.eat(_tokentype.types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp.parseExport = function (node) {
  this.next();
  // export * from '...'
  if (this.type === _tokentype.types.star) {
    var specifier = this.startNode();
    this.next();
    if (this.options.features["es7.exportExtensions"] && this.eatContextual("as")) {
      specifier.exported = this.parseIdent();
      node.specifiers = [this.finishNode(specifier, "ExportNamespaceSpecifier")];
      this.parseExportSpecifiersMaybe(node);
      this.parseExportFrom(node);
    } else {
      this.parseExportFrom(node);
      return this.finishNode(node, "ExportAllDeclaration");
    }
  } else if (this.isExportDefaultSpecifier()) {
    var specifier = this.startNode();
    specifier.exported = this.parseIdent(true);
    node.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")];
    if (this.type === _tokentype.types.comma && this.lookahead().type === _tokentype.types.star) {
      this.expect(_tokentype.types.comma);
      var _specifier = this.startNode();
      this.expect(_tokentype.types.star);
      this.expectContextual("as");
      _specifier.exported = this.parseIdent();
      node.specifiers.push(this.finishNode(_specifier, "ExportNamespaceSpecifier"));
    } else {
      this.parseExportSpecifiersMaybe(node);
    }
    this.parseExportFrom(node);
  } else if (this.eat(_tokentype.types._default)) {
    // export default ...
    var _expr = this.parseMaybeAssign();
    var needsSemi = true;
    if (_expr.type == "FunctionExpression" || _expr.type == "ClassExpression") {
      needsSemi = false;
      if (_expr.id) {
        _expr.type = _expr.type == "FunctionExpression" ? "FunctionDeclaration" : "ClassDeclaration";
      }
    }
    node.declaration = _expr;
    if (needsSemi) this.semicolon();
    this.checkExport(node);
    return this.finishNode(node, "ExportDefaultDeclaration");
  } else if (this.type.keyword || this.shouldParseExportDeclaration()) {
    node.declaration = this.parseStatement(true);
    node.specifiers = [];
    node.source = null;
  } else {
    // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers();
    if (this.eatContextual("from")) {
      node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
    } else {
      node.source = null;
    }
    this.semicolon();
  }
  this.checkExport(node);
  return this.finishNode(node, "ExportNamedDeclaration");
};

pp.isExportDefaultSpecifier = function () {
  if (this.type === _tokentype.types.name) {
    return this.value !== "type" && this.value !== "async";
  }

  if (this.type !== _tokentype.types._default) {
    return false;
  }

  var lookahead = this.lookahead();
  return lookahead.type === _tokentype.types.comma || lookahead.type === _tokentype.types.name && lookahead.value === "from";
};

pp.parseExportSpecifiersMaybe = function (node) {
  if (this.eat(_tokentype.types.comma)) {
    node.specifiers = node.specifiers.concat(this.parseExportSpecifiers());
  }
};

pp.parseExportFrom = function (node) {
  this.expectContextual("from");
  node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
  this.semicolon();
  this.checkExport(node);
};

pp.shouldParseExportDeclaration = function () {
  return this.options.features["es7.asyncFunctions"] && this.isContextual("async");
};

pp.checkExport = function (node) {
  if (this.decorators.length) {
    var isClass = node.declaration && (node.declaration.type === "ClassDeclaration" || node.declaration.type === "ClassExpression");
    if (!node.declaration || !isClass) {
      this.raise(node.start, "You can only use decorators on an export when exporting a class");
    }
    this.takeDecorators(node.declaration);
  }
};

// Parses a comma-separated list of module exports.

pp.parseExportSpecifiers = function () {
  var nodes = [],
      first = true;
  // export { x, y as z } [from '...']
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;

    var node = this.startNode();
    node.local = this.parseIdent(this.type === _tokentype.types._default);
    node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
    nodes.push(this.finishNode(node, "ExportSpecifier"));
  }
  return nodes;
};

// Parses import declaration.

pp.parseImport = function (node) {
  this.next();
  // import '...'
  if (this.type === _tokentype.types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = [];
    this.parseImportSpecifiers(node);
    this.expectContextual("from");
    node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};

// Parses a comma-separated list of module imports.

pp.parseImportSpecifiers = function (node) {
  var first = true;
  if (this.type === _tokentype.types.name) {
    // import defaultObj, { x, y as z } from '...'
    var start = this.markPosition();
    node.specifiers.push(this.parseImportSpecifierDefault(this.parseIdent(), start));
    if (!this.eat(_tokentype.types.comma)) return;
  }
  if (this.type === _tokentype.types.star) {
    var specifier = this.startNode();
    this.next();
    this.expectContextual("as");
    specifier.local = this.parseIdent();
    this.checkLVal(specifier.local, true);
    node.specifiers.push(this.finishNode(specifier, "ImportNamespaceSpecifier"));
    return;
  }
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;

    var specifier = this.startNode();
    specifier.imported = this.parseIdent(true);
    specifier.local = this.eatContextual("as") ? this.parseIdent() : specifier.imported;
    this.checkLVal(specifier.local, true);
    node.specifiers.push(this.finishNode(specifier, "ImportSpecifier"));
  }
};

pp.parseImportSpecifierDefault = function (id, start) {
  var node = this.startNodeAt(start);
  node.local = id;
  this.checkLVal(node.local, true);
  return this.finishNode(node, "ImportDefaultSpecifier");
};
},{"./state":12,"./tokentype":16,"./whitespace":18}],14:[function(require,module,exports){
// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _state = require("./state");

var _tokentype = require("./tokentype");

var _whitespace = require("./whitespace");

var TokContext = function TokContext(token, isExpr, preserveSpace, override) {
  _classCallCheck(this, TokContext);

  this.token = token;
  this.isExpr = isExpr;
  this.preserveSpace = preserveSpace;
  this.override = override;
};

exports.TokContext = TokContext;
var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", true),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) {
    return p.readTmplToken();
  }),
  f_expr: new TokContext("function", true)
};

exports.types = types;
var pp = _state.Parser.prototype;

pp.initialContext = function () {
  return [types.b_stat];
};

pp.braceIsBlock = function (prevType) {
  var parent = undefined;
  if (prevType === _tokentype.types.colon && (parent = this.curContext()).token == "{") return !parent.isExpr;
  if (prevType === _tokentype.types._return) return _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  if (prevType === _tokentype.types._else || prevType === _tokentype.types.semi || prevType === _tokentype.types.eof) return true;
  if (prevType == _tokentype.types.braceL) return this.curContext() === types.b_stat;
  return !this.exprAllowed;
};

pp.updateContext = function (prevType) {
  var update = undefined,
      type = this.type;
  if (type.keyword && prevType == _tokentype.types.dot) this.exprAllowed = false;else if (update = type.updateContext) update.call(this, prevType);else this.exprAllowed = type.beforeExpr;
};

// Token-specific context update code

_tokentype.types.parenR.updateContext = _tokentype.types.braceR.updateContext = function () {
  if (this.context.length == 1) {
    this.exprAllowed = true;
    return;
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext() === types.f_expr) {
    this.context.pop();
    this.exprAllowed = false;
  } else if (out === types.b_tmpl) {
    this.exprAllowed = true;
  } else {
    this.exprAllowed = !out.isExpr;
  }
};

_tokentype.types.braceL.updateContext = function (prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};

_tokentype.types.dollarBraceL.updateContext = function () {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};

_tokentype.types.parenL.updateContext = function (prevType) {
  var statementParens = prevType === _tokentype.types._if || prevType === _tokentype.types._for || prevType === _tokentype.types._with || prevType === _tokentype.types._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};

_tokentype.types.incDec.updateContext = function () {};

_tokentype.types._function.updateContext = function () {
  if (this.curContext() !== types.b_stat) this.context.push(types.f_expr);
  this.exprAllowed = false;
};

_tokentype.types.backQuote.updateContext = function () {
  if (this.curContext() === types.q_tmpl) this.context.pop();else this.context.push(types.q_tmpl);
  this.exprAllowed = false;
};

// tokExprAllowed stays unchanged
},{"./state":12,"./tokentype":16,"./whitespace":18}],15:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _identifier = require("./identifier");

var _tokentype = require("./tokentype");

var _state = require("./state");

var _location = require("./location");

var _whitespace = require("./whitespace");

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  _classCallCheck(this, Token);

  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations) this.loc = new _location.SourceLocation(p, p.startLoc, p.endLoc);
  if (p.options.ranges) this.range = [p.start, p.end];
};

exports.Token = Token;

// ## Tokenizer

var pp = _state.Parser.prototype;

// Move to the next token

pp.next = function () {
  if (this.options.onToken && !this.isLookahead) this.options.onToken(new Token(this));

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp.getToken = function () {
  this.next();
  return new Token(this);
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined") pp[Symbol.iterator] = function () {
  var self = this;
  return { next: function next() {
      var token = self.getToken();
      return {
        done: token.type === _tokentype.types.eof,
        value: token
      };
    } };
};

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp.setStrict = function (strict) {
  this.strict = strict;
  if (this.type !== _tokentype.types.num && this.type !== _tokentype.types.string) return;
  this.pos = this.start;
  if (this.options.locations) {
    while (this.pos < this.lineStart) {
      this.lineStart = this.input.lastIndexOf("\n", this.lineStart - 2) + 1;
      --this.curLine;
    }
  }
  this.nextToken();
};

pp.curContext = function () {
  return this.context[this.context.length - 1];
};

// Read a single token, updating the parser object's token-related
// properties.

pp.nextToken = function () {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) this.skipSpace();

  this.start = this.pos;
  if (this.options.locations) this.startLoc = this.curPosition();
  if (this.pos >= this.input.length) return this.finishToken(_tokentype.types.eof);

  if (curContext.override) return curContext.override(this);else this.readToken(this.fullCharCodeAtPos());
};

pp.readToken = function (code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if ((0, _identifier.isIdentifierStart)(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */) return this.readWord();

  return this.getTokenFromCode(code);
};

pp.fullCharCodeAtPos = function () {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 55295 || code >= 57344) return code;
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 56613888;
};

pp.skipBlockComment = function () {
  var startLoc = this.options.onComment && this.options.locations && this.curPosition();
  var start = this.pos,
      end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
  this.pos = end + 2;
  if (this.options.locations) {
    _whitespace.lineBreakG.lastIndex = start;
    var match = undefined;
    while ((match = _whitespace.lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this.curLine;
      this.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment) this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos, startLoc, this.options.locations && this.curPosition());
};

pp.skipLineComment = function (startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.options.locations && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
    ++this.pos;
    ch = this.input.charCodeAt(this.pos);
  }
  if (this.options.onComment) this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos, startLoc, this.options.locations && this.curPosition());
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp.skipSpace = function () {
  while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 32) {
      // ' '
      ++this.pos;
    } else if (ch === 13) {
      ++this.pos;
      var _next = this.input.charCodeAt(this.pos);
      if (_next === 10) {
        ++this.pos;
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
    } else if (ch === 10 || ch === 8232 || ch === 8233) {
      ++this.pos;
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
    } else if (ch > 8 && ch < 14) {
      ++this.pos;
    } else if (ch === 47) {
      // '/'
      var _next2 = this.input.charCodeAt(this.pos + 1);
      if (_next2 === 42) {
        // '*'
        this.skipBlockComment();
      } else if (_next2 === 47) {
        // '/'
        this.skipLineComment(2);
      } else break;
    } else if (ch === 160) {
      // '\xa0'
      ++this.pos;
    } else if (ch >= 5760 && _whitespace.nonASCIIwhitespace.test(String.fromCharCode(ch))) {
      ++this.pos;
    } else {
      break;
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp.finishToken = function (type, val) {
  this.end = this.pos;
  if (this.options.locations) this.endLoc = this.curPosition();
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp.readToken_dot = function () {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) return this.readNumber(true);
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
    // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(_tokentype.types.ellipsis);
  } else {
    ++this.pos;
    return this.finishToken(_tokentype.types.dot);
  }
};

pp.readToken_slash = function () {
  // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) {
    ++this.pos;return this.readRegexp();
  }
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.slash, 1);
};

pp.readToken_mult_modulo = function (code) {
  // '%*'
  var type = code === 42 ? _tokentype.types.star : _tokentype.types.modulo;
  var width = 1;
  var next = this.input.charCodeAt(this.pos + 1);

  if (next === 42) {
    // '*'
    width++;
    next = this.input.charCodeAt(this.pos + 2);
    type = _tokentype.types.exponent;
  }

  if (next === 61) {
    width++;
    type = _tokentype.types.assign;
  }

  return this.finishOp(type, width);
};

pp.readToken_pipe_amp = function (code) {
  // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) return this.finishOp(code === 124 ? _tokentype.types.logicalOR : _tokentype.types.logicalAND, 2);
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(code === 124 ? _tokentype.types.bitwiseOR : _tokentype.types.bitwiseAND, 1);
};

pp.readToken_caret = function () {
  // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.bitwiseXOR, 1);
};

pp.readToken_plus_min = function (code) {
  // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 && _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.pos))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken();
    }
    return this.finishOp(_tokentype.types.incDec, 2);
  }
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.plusMin, 1);
};

pp.readToken_lt_gt = function (code) {
  // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) return this.finishOp(_tokentype.types.assign, size + 1);
    return this.finishOp(_tokentype.types.bitShift, size);
  }
  if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 && this.input.charCodeAt(this.pos + 3) == 45) {
    if (this.inModule) this.unexpected();
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken();
  }
  if (next === 61) size = this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2;
  return this.finishOp(_tokentype.types.relational, size);
};

pp.readToken_eq_excl = function (code) {
  // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) return this.finishOp(_tokentype.types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
    // '=>'
    this.pos += 2;
    return this.finishToken(_tokentype.types.arrow);
  }
  return this.finishOp(code === 61 ? _tokentype.types.eq : _tokentype.types.prefix, 1);
};

pp.getTokenFromCode = function (code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46:
      // '.'
      return this.readToken_dot();

    // Punctuation tokens.
    case 40:
      ++this.pos;return this.finishToken(_tokentype.types.parenL);
    case 41:
      ++this.pos;return this.finishToken(_tokentype.types.parenR);
    case 59:
      ++this.pos;return this.finishToken(_tokentype.types.semi);
    case 44:
      ++this.pos;return this.finishToken(_tokentype.types.comma);
    case 91:
      ++this.pos;return this.finishToken(_tokentype.types.bracketL);
    case 93:
      ++this.pos;return this.finishToken(_tokentype.types.bracketR);
    case 123:
      ++this.pos;return this.finishToken(_tokentype.types.braceL);
    case 125:
      ++this.pos;return this.finishToken(_tokentype.types.braceR);
    case 58:
      ++this.pos;return this.finishToken(_tokentype.types.colon);
    case 63:
      ++this.pos;return this.finishToken(_tokentype.types.question);
    case 64:
      ++this.pos;return this.finishToken(_tokentype.types.at);

    case 96:
      // '`'
      if (this.options.ecmaVersion < 6) break;
      ++this.pos;
      return this.finishToken(_tokentype.types.backQuote);

    case 48:
      // '0'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 120 || next === 88) return this.readRadixNumber(16); // '0x', '0X' - hex number
      if (this.options.ecmaVersion >= 6) {
        if (next === 111 || next === 79) return this.readRadixNumber(8); // '0o', '0O' - octal number
        if (next === 98 || next === 66) return this.readRadixNumber(2); // '0b', '0B' - binary number
      }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:
      // 1-9
      return this.readNumber(false);

    // Quotes produce strings.
    case 34:case 39:
      // '"', "'"
      return this.readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47:
      // '/'
      return this.readToken_slash();

    case 37:case 42:
      // '%*'
      return this.readToken_mult_modulo(code);

    case 124:case 38:
      // '|&'
      return this.readToken_pipe_amp(code);

    case 94:
      // '^'
      return this.readToken_caret();

    case 43:case 45:
      // '+-'
      return this.readToken_plus_min(code);

    case 60:case 62:
      // '<>'
      return this.readToken_lt_gt(code);

    case 61:case 33:
      // '=!'
      return this.readToken_eq_excl(code);

    case 126:
      // '~'
      return this.finishOp(_tokentype.types.prefix, 1);
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.finishOp = function (type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str);
};

var regexpUnicodeSupport = false;
try {
  new RegExp("￿", "u");regexpUnicodeSupport = true;
} catch (e) {}

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

pp.readRegexp = function () {
  var escaped = undefined,
      inClass = undefined,
      start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(start, "Unterminated regular expression");
    var ch = this.input.charAt(this.pos);
    if (_whitespace.lineBreak.test(ch)) this.raise(start, "Unterminated regular expression");
    if (!escaped) {
      if (ch === "[") inClass = true;else if (ch === "]" && inClass) inClass = false;else if (ch === "/" && !inClass) break;
      escaped = ch === "\\";
    } else escaped = false;
    ++this.pos;
  }
  var content = this.input.slice(start, this.pos);
  ++this.pos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = this.readWord1();
  var tmp = content;
  if (mods) {
    var validFlags = /^[gmsiy]*$/;
    if (this.options.ecmaVersion >= 6) validFlags = /^[gmsiyu]*$/;
    if (!validFlags.test(mods)) this.raise(start, "Invalid regular expression flag");
    if (mods.indexOf("u") >= 0 && !regexpUnicodeSupport) {
      // Replace each astral symbol and every Unicode escape sequence that
      // possibly represents an astral symbol or a paired surrogate with a
      // single ASCII symbol to avoid throwing on regular expressions that
      // are only valid in combination with the `/u` flag.
      // Note: replacing with the ASCII symbol `x` might cause false
      // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
      // perfectly valid pattern that is equivalent to `[a-b]`, but it would
      // be replaced by `[x-b]` which throws an error.
      tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|\\u\{([0-9a-fA-F]+)\}|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
    }
  }
  // Detect invalid regular expressions.
  try {
    new RegExp(tmp);
  } catch (e) {
    if (e instanceof SyntaxError) this.raise(start, "Error parsing regular expression: " + e.message);
    this.raise(e);
  }
  // Get a regular expression object for this pattern-flag pair, or `null` in
  // case the current environment doesn't support the flags it uses.
  var value = undefined;
  try {
    value = new RegExp(content, mods);
  } catch (err) {
    value = null;
  }
  return this.finishToken(_tokentype.types.regexp, { pattern: content, flags: mods, value: value });
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp.readInt = function (radix, len) {
  var start = this.pos,
      total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this.input.charCodeAt(this.pos),
        val = undefined;
    if (code >= 97) val = code - 97 + 10; // a
    else if (code >= 65) val = code - 65 + 10; // A
    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
    else val = Infinity;
    if (val >= radix) break;
    ++this.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) return null;

  return total;
};

pp.readRadixNumber = function (radix) {
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) this.raise(this.start + 2, "Expected number in radix " + radix);
  if ((0, _identifier.isIdentifierStart)(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
  return this.finishToken(_tokentype.types.num, val);
};

// Read an integer, octal integer, or floating-point number.

pp.readNumber = function (startsWithDot) {
  var start = this.pos,
      isFloat = false,
      octal = this.input.charCodeAt(this.pos) === 48;
  if (!startsWithDot && this.readInt(10) === null) this.raise(start, "Invalid number");
  if (this.input.charCodeAt(this.pos) === 46) {
    ++this.pos;
    this.readInt(10);
    isFloat = true;
  }
  var next = this.input.charCodeAt(this.pos);
  if (next === 69 || next === 101) {
    // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) ++this.pos; // '+-'
    if (this.readInt(10) === null) this.raise(start, "Invalid number");
    isFloat = true;
  }
  if ((0, _identifier.isIdentifierStart)(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");

  var str = this.input.slice(start, this.pos),
      val = undefined;
  if (isFloat) val = parseFloat(str);else if (!octal || str.length === 1) val = parseInt(str, 10);else if (/[89]/.test(str) || this.strict) this.raise(start, "Invalid number");else val = parseInt(str, 8);
  return this.finishToken(_tokentype.types.num, val);
};

// Read a string value, interpreting backslash-escapes.

pp.readCodePoint = function () {
  var ch = this.input.charCodeAt(this.pos),
      code = undefined;

  if (ch === 123) {
    if (this.options.ecmaVersion < 6) this.unexpected();
    ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 1114111) this.unexpected();
  } else {
    code = this.readHexChar(4);
  }
  return code;
};

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 65535) return String.fromCharCode(code);
  return String.fromCharCode((code - 65536 >> 10) + 55296, (code - 65536 & 1023) + 56320);
}

pp.readString = function (quote) {
  var out = "",
      chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(this.start, "Unterminated string constant");
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) break;
    if (ch === 92) {
      // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar();
      chunkStart = this.pos;
    } else {
      if ((0, _whitespace.isNewLine)(ch)) this.raise(this.start, "Unterminated string constant");
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(_tokentype.types.string, out);
};

// Reads template string tokens.

pp.readTmplToken = function () {
  var out = "",
      chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(this.start, "Unterminated template");
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
      // '`', '${'
      if (this.pos === this.start && this.type === _tokentype.types.template) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(_tokentype.types.dollarBraceL);
        } else {
          ++this.pos;
          return this.finishToken(_tokentype.types.backQuote);
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(_tokentype.types.template, out);
    }
    if (ch === 92) {
      // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar();
      chunkStart = this.pos;
    } else if ((0, _whitespace.isNewLine)(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      if (ch === 13 && this.input.charCodeAt(this.pos) === 10) {
        ++this.pos;
        out += "\n";
      } else {
        out += String.fromCharCode(ch);
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Used to read escaped characters

pp.readEscapedChar = function () {
  var ch = this.input.charCodeAt(++this.pos);
  var octal = /^[0-7]+/.exec(this.input.slice(this.pos, this.pos + 3));
  if (octal) octal = octal[0];
  while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
  if (octal === "0") octal = null;
  ++this.pos;
  if (octal) {
    if (this.strict) this.raise(this.pos - 2, "Octal literal in strict mode");
    this.pos += octal.length - 1;
    return String.fromCharCode(parseInt(octal, 8));
  } else {
    switch (ch) {
      case 110:
        return "\n"; // 'n' -> '\n'
      case 114:
        return "\r"; // 'r' -> '\r'
      case 120:
        return String.fromCharCode(this.readHexChar(2)); // 'x'
      case 117:
        return codePointToString(this.readCodePoint()); // 'u'
      case 116:
        return "\t"; // 't' -> '\t'
      case 98:
        return "\b"; // 'b' -> '\b'
      case 118:
        return "\u000b"; // 'v' -> '\u000b'
      case 102:
        return "\f"; // 'f' -> '\f'
      case 48:
        return "\u0000"; // 0 -> '\0'
      case 13:
        if (this.input.charCodeAt(this.pos) === 10) ++this.pos; // '\r\n'
      case 10:
        // ' \n'
        if (this.options.locations) {
          this.lineStart = this.pos;++this.curLine;
        }
        return "";
      default:
        return String.fromCharCode(ch);
    }
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp.readHexChar = function (len) {
  var n = this.readInt(16, len);
  if (n === null) this.raise(this.start, "Bad character escape sequence");
  return n;
};

// Used to signal to callers of `readWord1` whether the word
// contained any escape sequences. This is needed because words with
// escape sequences must not be interpreted as keywords.

var containsEsc;

// Read an identifier, and return it as a string. Sets `containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp.readWord1 = function () {
  containsEsc = false;
  var word = "",
      first = true,
      chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if ((0, _identifier.isIdentifierChar)(ch, astral)) {
      this.pos += ch <= 65535 ? 1 : 2;
    } else if (ch === 92) {
      // "\"
      containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) != 117) // "u"
        this.raise(this.pos, "Expecting Unicode escape sequence \\uXXXX");
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? _identifier.isIdentifierStart : _identifier.isIdentifierChar)(esc, astral)) this.raise(escStart, "Invalid Unicode escape");
      word += codePointToString(esc);
      chunkStart = this.pos;
    } else {
      break;
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos);
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp.readWord = function () {
  var word = this.readWord1();
  var type = _tokentype.types.name;
  if ((this.options.ecmaVersion >= 6 || !containsEsc) && this.isKeyword(word)) type = _tokentype.keywords[word];
  return this.finishToken(type, word);
};
},{"./identifier":4,"./location":6,"./state":12,"./tokentype":16,"./whitespace":18}],16:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label) {
  var conf = arguments[1] === undefined ? {} : arguments[1];

  _classCallCheck(this, TokenType);

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.rightAssociative = !!conf.rightAssociative;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

exports.TokenType = TokenType;

function binop(name, prec) {
  return new TokenType(name, { beforeExpr: true, binop: prec });
}
var beforeExpr = { beforeExpr: true },
    startsExpr = { startsExpr: true };

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),
  at: new TokenType("@"),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
  assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
  incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
  prefix: new TokenType("prefix", { beforeExpr: true, prefix: true, startsExpr: true }),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=", 6),
  relational: binop("</>", 7),
  bitShift: binop("<</>>", 8),
  plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  exponent: new TokenType("**", { beforeExpr: true, binop: 11, rightAssociative: true })
};

exports.types = types;
// Map keyword names to token types.

var keywords = {};

exports.keywords = keywords;
// Succinct definitions of keyword token types
function kw(name) {
  var options = arguments[1] === undefined ? {} : arguments[1];

  options.keyword = name;
  keywords[name] = types["_" + name] = new TokenType(name, options);
}

kw("break");
kw("case", beforeExpr);
kw("catch");
kw("continue");
kw("debugger");
kw("default");
kw("do", { isLoop: true });
kw("else", beforeExpr);
kw("finally");
kw("for", { isLoop: true });
kw("function", startsExpr);
kw("if");
kw("return", beforeExpr);
kw("switch");
kw("throw", beforeExpr);
kw("try");
kw("var");
kw("let");
kw("const");
kw("while", { isLoop: true });
kw("with");
kw("new", { beforeExpr: true, startsExpr: true });
kw("this", startsExpr);
kw("super", startsExpr);
kw("class");
kw("extends", beforeExpr);
kw("export");
kw("import");
kw("yield", { beforeExpr: true, startsExpr: true });
kw("null", startsExpr);
kw("true", startsExpr);
kw("false", startsExpr);
kw("in", { beforeExpr: true, binop: 7 });
kw("instanceof", { beforeExpr: true, binop: 7 });
kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true });
kw("void", { beforeExpr: true, prefix: true, startsExpr: true });
kw("delete", { beforeExpr: true, prefix: true, startsExpr: true });
},{}],17:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.isArray = isArray;

// Checks if an object has a property.

exports.has = has;

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

function has(obj, propName) {
  return Object.prototype.hasOwnProperty.call(obj, propName);
}
},{}],18:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.isNewLine = isNewLine;
// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
exports.lineBreak = lineBreak;
var lineBreakG = new RegExp(lineBreak.source, "g");

exports.lineBreakG = lineBreakG;

function isNewLine(code) {
  return code === 10 || code === 13 || code === 8232 || code == 8233;
}

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
exports.nonASCIIwhitespace = nonASCIIwhitespace;
},{}],19:[function(require,module,exports){
(function (global){
"use strict";

require("./node");
var transform = module.exports = require("../transformation");

transform.options = require("../transformation/file/options");
transform.version = require("../../../package").version;

transform.transform = transform;

transform.run = function (code) {
  var opts = arguments[1] === undefined ? {} : arguments[1];

  opts.sourceMaps = "inline";
  return new Function(transform(code, opts).code)();
};

transform.load = function (url, callback, _x2, hold) {
  var opts = arguments[2] === undefined ? {} : arguments[2];

  opts.filename = opts.filename || url;

  var xhr = global.ActiveXObject ? new global.ActiveXObject("Microsoft.XMLHTTP") : new global.XMLHttpRequest();
  xhr.open("GET", url, true);
  if ("overrideMimeType" in xhr) xhr.overrideMimeType("text/plain");

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;

    var status = xhr.status;
    if (status === 0 || status === 200) {
      var param = [xhr.responseText, opts];
      if (!hold) transform.run.apply(transform, param);
      if (callback) callback(param);
    } else {
      throw new Error("Could not load " + url);
    }
  };

  xhr.send(null);
};

var runScripts = function runScripts() {
  var scripts = [];
  var types = ["text/ecmascript-6", "text/6to5", "text/babel", "module"];
  var index = 0;

  var exec = function exec() {
    var param = scripts[index];
    if (param instanceof Array) {
      transform.run.apply(transform, param);
      index++;
      exec();
    }
  };

  var run = function run(script, i) {
    var opts = {};

    if (script.src) {
      transform.load(script.src, function (param) {
        scripts[i] = param;
        exec();
      }, opts, true);
    } else {
      opts.filename = "embedded";
      scripts[i] = [script.innerHTML, opts];
    }
  };

  var _scripts = global.document.getElementsByTagName("script");

  for (var i = 0; i < _scripts.length; ++i) {
    var _script = _scripts[i];
    if (types.indexOf(_script.type) >= 0) scripts.push(_script);
  }

  for (i in scripts) {
    run(scripts[i], i);
  }

  exec();
};

if (global.addEventListener) {
  global.addEventListener("DOMContentLoaded", runScripts, false);
} else if (global.attachEvent) {
  global.attachEvent("onload", runScripts);
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../../package":494,"../transformation":70,"../transformation/file/options":54,"./node":20}],20:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.register = register;
exports.polyfill = polyfill;
exports.transformFile = transformFile;
exports.transformFileSync = transformFileSync;
exports.parse = parse;

function _interopRequire(obj) { return obj && obj.__esModule ? obj["default"] : obj; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsFunction = require("lodash/lang/isFunction");

var _lodashLangIsFunction2 = _interopRequireDefault(_lodashLangIsFunction);

var _transformation = require("../transformation");

var _transformation2 = _interopRequireDefault(_transformation);

var _acorn = require("../../acorn");

var acorn = _interopRequireWildcard(_acorn);

var _util = require("../util");

var util = _interopRequireWildcard(_util);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

exports.util = util;
exports.acorn = acorn;
exports.transform = _transformation2["default"];
exports.pipeline = _transformation.pipeline;
exports.canCompile = _util.canCompile;

var _transformationFileOptions = require("../transformation/file/options");

exports.options = _interopRequire(_transformationFileOptions);

var _transformationTransformer = require("../transformation/transformer");

exports.Transformer = _interopRequire(_transformationTransformer);

var _transformationTransformerPipeline = require("../transformation/transformer-pipeline");

exports.TransformerPipeline = _interopRequire(_transformationTransformerPipeline);

var _traversal = require("../traversal");

exports.traverse = _interopRequire(_traversal);

var _toolsBuildExternalHelpers = require("../tools/build-external-helpers");

exports.buildExternalHelpers = _interopRequire(_toolsBuildExternalHelpers);

var _package = require("../../../package");

exports.version = _package.version;
exports.types = t;

function register(opts) {
  var callback = require("./register/node-polyfill");
  if (opts != null) callback(opts);
  return callback;
}

function polyfill() {
  require("../polyfill");
}

function transformFile(filename, opts, callback) {
  if ((0, _lodashLangIsFunction2["default"])(opts)) {
    callback = opts;
    opts = {};
  }

  opts.filename = filename;

  _fs2["default"].readFile(filename, function (err, code) {
    if (err) return callback(err);

    var result;

    try {
      result = (0, _transformation2["default"])(code, opts);
    } catch (err) {
      return callback(err);
    }

    callback(null, result);
  });
}

function transformFileSync(filename) {
  var opts = arguments[1] === undefined ? {} : arguments[1];

  opts.filename = filename;
  return (0, _transformation2["default"])(_fs2["default"].readFileSync(filename, "utf8"), opts);
}

function parse(code) {
  var opts = arguments[1] === undefined ? {} : arguments[1];

  opts.allowHashBang = true;
  opts.sourceType = "module";
  opts.ecmaVersion = Infinity;
  opts.plugins = {
    flow: true,
    jsx: true
  };
  opts.features = {};

  for (var key in _transformation2["default"].pipeline.transformers) {
    opts.features[key] = true;
  }

  return acorn.parse(code, opts);
}
},{"../../../package":494,"../../acorn":1,"../polyfill":48,"../tools/build-external-helpers":49,"../transformation":70,"../transformation/file/options":54,"../transformation/transformer":84,"../transformation/transformer-pipeline":83,"../traversal":156,"../types":167,"../util":171,"./register/node-polyfill":22,"fs":187,"lodash/lang/isFunction":406}],21:[function(require,module,exports){
"use strict";

exports.__esModule = true;

require("../../polyfill");

// required to safely use babel/register within a browserify codebase

exports["default"] = function () {};

;

module.exports = exports["default"];
},{"../../polyfill":48}],22:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequire(obj) { return obj && obj.__esModule ? obj["default"] : obj; }

require("../../polyfill");

var _node = require("./node");

exports["default"] = _interopRequire(_node);
module.exports = exports["default"];
},{"../../polyfill":48,"./node":21}],23:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _repeating = require("repeating");

var _repeating2 = _interopRequireDefault(_repeating);

var _trimRight = require("trim-right");

var _trimRight2 = _interopRequireDefault(_trimRight);

var _lodashLangIsBoolean = require("lodash/lang/isBoolean");

var _lodashLangIsBoolean2 = _interopRequireDefault(_lodashLangIsBoolean);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _lodashLangIsNumber = require("lodash/lang/isNumber");

var _lodashLangIsNumber2 = _interopRequireDefault(_lodashLangIsNumber);

var Buffer = (function () {
  function Buffer(position, format) {
    _classCallCheck(this, Buffer);

    this.position = position;
    this._indent = format.indent.base;
    this.format = format;
    this.buf = "";
  }

  Buffer.prototype.get = function get() {
    return (0, _trimRight2["default"])(this.buf);
  };

  Buffer.prototype.getIndent = function getIndent() {
    if (this.format.compact || this.format.concise) {
      return "";
    } else {
      return (0, _repeating2["default"])(this.format.indent.style, this._indent);
    }
  };

  Buffer.prototype.indentSize = function indentSize() {
    return this.getIndent().length;
  };

  Buffer.prototype.indent = function indent() {
    this._indent++;
  };

  Buffer.prototype.dedent = function dedent() {
    this._indent--;
  };

  Buffer.prototype.semicolon = function semicolon() {
    this.push(";");
  };

  Buffer.prototype.ensureSemicolon = function ensureSemicolon() {
    if (!this.isLast(";")) this.semicolon();
  };

  Buffer.prototype.rightBrace = function rightBrace() {
    this.newline(true);
    this.push("}");
  };

  Buffer.prototype.keyword = function keyword(name) {
    this.push(name);
    this.space();
  };

  Buffer.prototype.space = function space() {
    if (this.format.compact) return;
    if (this.buf && !this.isLast(" ") && !this.isLast("\n")) {
      this.push(" ");
    }
  };

  Buffer.prototype.removeLast = function removeLast(cha) {
    if (this.format.compact) return;
    if (!this.isLast(cha)) return;

    this.buf = this.buf.substr(0, this.buf.length - 1);
    this.position.unshift(cha);
  };

  Buffer.prototype.newline = function newline(i, removeLast) {
    if (this.format.compact || this.format.retainLines) return;

    if (this.format.concise) {
      this.space();
      return;
    }

    removeLast = removeLast || false;

    if ((0, _lodashLangIsNumber2["default"])(i)) {
      i = Math.min(2, i);

      if (this.endsWith("{\n") || this.endsWith(":\n")) i--;
      if (i <= 0) return;

      while (i > 0) {
        this._newline(removeLast);
        i--;
      }
      return;
    }

    if ((0, _lodashLangIsBoolean2["default"])(i)) {
      removeLast = i;
    }

    this._newline(removeLast);
  };

  Buffer.prototype._newline = function _newline(removeLast) {
    // never allow more than two lines
    if (this.endsWith("\n\n")) return;

    // remove the last newline
    if (removeLast && this.isLast("\n")) this.removeLast("\n");

    this.removeLast(" ");
    this._removeSpacesAfterLastNewline();
    this._push("\n");
  };

  /**
   * If buffer ends with a newline and some spaces after it, trim those spaces.
   */

  Buffer.prototype._removeSpacesAfterLastNewline = function _removeSpacesAfterLastNewline() {
    var lastNewlineIndex = this.buf.lastIndexOf("\n");
    if (lastNewlineIndex === -1) return;

    var index = this.buf.length - 1;
    while (index > lastNewlineIndex) {
      if (this.buf[index] !== " ") {
        break;
      }

      index--;
    }

    if (index === lastNewlineIndex) {
      this.buf = this.buf.substring(0, index + 1);
    }
  };

  Buffer.prototype.push = function push(str, noIndent) {
    if (!this.format.compact && this._indent && !noIndent && str !== "\n") {
      // we have an indent level and we aren't pushing a newline
      var indent = this.getIndent();

      // replace all newlines with newlines with the indentation
      str = str.replace(/\n/g, "\n" + indent);

      // we've got a newline before us so prepend on the indentation
      if (this.isLast("\n")) this._push(indent);
    }

    this._push(str);
  };

  Buffer.prototype._push = function _push(str) {
    this.position.push(str);
    this.buf += str;
  };

  Buffer.prototype.endsWith = function endsWith(str) {
    return this.buf.slice(-str.length) === str;
  };

  Buffer.prototype.isLast = function isLast(cha) {
    if (this.format.compact) return false;

    var buf = this.buf;
    var last = buf[buf.length - 1];

    if (Array.isArray(cha)) {
      return (0, _lodashCollectionIncludes2["default"])(cha, last);
    } else {
      return cha === last;
    }
  };

  return Buffer;
})();

exports["default"] = Buffer;
module.exports = exports["default"];
},{"lodash/collection/includes":330,"lodash/lang/isBoolean":404,"lodash/lang/isNumber":408,"repeating":476,"trim-right":493}],24:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.File = File;
exports.Program = Program;
exports.BlockStatement = BlockStatement;

function File(node, print) {
  print(node.program);
}

function Program(node, print) {
  print.sequence(node.body);
}

function BlockStatement(node, print) {
  if (node.body.length === 0) {
    this.push("{}");
  } else {
    this.push("{");
    this.newline();
    print.sequence(node.body, { indent: true });
    if (!this.format.retainLines) this.removeLast("\n");
    this.rightBrace();
  }
}
},{}],25:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ClassDeclaration = ClassDeclaration;
exports.ClassBody = ClassBody;
exports.ClassProperty = ClassProperty;
exports.MethodDefinition = MethodDefinition;

function ClassDeclaration(node, print) {
  print.list(node.decorators);
  this.push("class");

  if (node.id) {
    this.space();
    print(node.id);
  }

  print(node.typeParameters);

  if (node.superClass) {
    this.push(" extends ");
    print(node.superClass);
    print(node.superTypeParameters);
  }

  if (node["implements"]) {
    this.push(" implements ");
    print.join(node["implements"], { separator: ", " });
  }

  this.space();
  print(node.body);
}

exports.ClassExpression = ClassDeclaration;

function ClassBody(node, print) {
  if (node.body.length === 0) {
    this.push("{}");
  } else {
    this.push("{");
    this.newline();

    this.indent();
    print.sequence(node.body);
    this.dedent();

    this.rightBrace();
  }
}

function ClassProperty(node, print) {
  print.list(node.decorators);

  if (node["static"]) this.push("static ");
  print(node.key);
  print(node.typeAnnotation);
  if (node.value) {
    this.space();
    this.push("=");
    this.space();
    print(node.value);
  }
  this.semicolon();
}

function MethodDefinition(node, print) {
  print.list(node.decorators);

  if (node["static"]) {
    this.push("static ");
  }

  this._method(node, print);
}
},{}],26:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ComprehensionBlock = ComprehensionBlock;
exports.ComprehensionExpression = ComprehensionExpression;

function ComprehensionBlock(node, print) {
  this.keyword("for");
  this.push("(");
  print(node.left);
  this.push(" of ");
  print(node.right);
  this.push(")");
}

function ComprehensionExpression(node, print) {
  this.push(node.generator ? "(" : "[");

  print.join(node.blocks, { separator: " " });
  this.space();

  if (node.filter) {
    this.keyword("if");
    this.push("(");
    print(node.filter);
    this.push(")");
    this.space();
  }

  print(node.body);

  this.push(node.generator ? ")" : "]");
}
},{}],27:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.UnaryExpression = UnaryExpression;
exports.DoExpression = DoExpression;
exports.UpdateExpression = UpdateExpression;
exports.ConditionalExpression = ConditionalExpression;
exports.NewExpression = NewExpression;
exports.SequenceExpression = SequenceExpression;
exports.ThisExpression = ThisExpression;
exports.Super = Super;
exports.Decorator = Decorator;
exports.CallExpression = CallExpression;
exports.EmptyStatement = EmptyStatement;
exports.ExpressionStatement = ExpressionStatement;
exports.AssignmentExpression = AssignmentExpression;
exports.MemberExpression = MemberExpression;
exports.MetaProperty = MetaProperty;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _isInteger = require("is-integer");

var _isInteger2 = _interopRequireDefault(_isInteger);

var _lodashLangIsNumber = require("lodash/lang/isNumber");

var _lodashLangIsNumber2 = _interopRequireDefault(_lodashLangIsNumber);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function UnaryExpression(node, print) {
  var hasSpace = /[a-z]$/.test(node.operator);
  var arg = node.argument;

  if (t.isUpdateExpression(arg) || t.isUnaryExpression(arg)) {
    hasSpace = true;
  }

  if (t.isUnaryExpression(arg) && arg.operator === "!") {
    hasSpace = false;
  }

  this.push(node.operator);
  if (hasSpace) this.push(" ");
  print(node.argument);
}

function DoExpression(node, print) {
  this.push("do");
  this.space();
  print(node.body);
}

function UpdateExpression(node, print) {
  if (node.prefix) {
    this.push(node.operator);
    print(node.argument);
  } else {
    print(node.argument);
    this.push(node.operator);
  }
}

function ConditionalExpression(node, print) {
  print(node.test);
  this.space();
  this.push("?");
  this.space();
  print(node.consequent);
  this.space();
  this.push(":");
  this.space();
  print(node.alternate);
}

function NewExpression(node, print) {
  this.push("new ");
  print(node.callee);
  this.push("(");
  print.list(node.arguments);
  this.push(")");
}

function SequenceExpression(node, print) {
  print.list(node.expressions);
}

function ThisExpression() {
  this.push("this");
}

function Super() {
  this.push("super");
}

function Decorator(node, print) {
  this.push("@");
  print(node.expression);
}

function CallExpression(node, print) {
  print(node.callee);

  this.push("(");

  var separator = ",";

  if (node._prettyCall) {
    separator += "\n";
    this.newline();
    this.indent();
  } else {
    separator += " ";
  }

  print.list(node.arguments, { separator: separator });

  if (node._prettyCall) {
    this.newline();
    this.dedent();
  }

  this.push(")");
}

var buildYieldAwait = function buildYieldAwait(keyword) {
  return function (node, print) {
    this.push(keyword);

    if (node.delegate || node.all) {
      this.push("*");
    }

    if (node.argument) {
      this.space();
      print(node.argument);
    }
  };
};

var YieldExpression = buildYieldAwait("yield");
exports.YieldExpression = YieldExpression;
var AwaitExpression = buildYieldAwait("await");

exports.AwaitExpression = AwaitExpression;

function EmptyStatement() {
  this.semicolon();
}

function ExpressionStatement(node, print) {
  print(node.expression);
  this.semicolon();
}

function AssignmentExpression(node, print) {
  // todo: add cases where the spaces can be dropped when in compact mode
  print(node.left);
  this.push(" ");
  this.push(node.operator);
  this.push(" ");
  print(node.right);
}

exports.BinaryExpression = AssignmentExpression;
exports.LogicalExpression = AssignmentExpression;
exports.AssignmentPattern = AssignmentExpression;

var SCIENTIFIC_NOTATION = /e/i;

function MemberExpression(node, print) {
  var obj = node.object;
  print(obj);

  if (!node.computed && t.isMemberExpression(node.property)) {
    throw new TypeError("Got a MemberExpression for MemberExpression property");
  }

  var computed = node.computed;
  if (t.isLiteral(node.property) && (0, _lodashLangIsNumber2["default"])(node.property.value)) {
    computed = true;
  }

  if (computed) {
    this.push("[");
    print(node.property);
    this.push("]");
  } else {
    // 5..toFixed(2);
    if (t.isLiteral(obj) && (0, _isInteger2["default"])(obj.value) && !SCIENTIFIC_NOTATION.test(obj.value.toString())) {
      this.push(".");
    }

    this.push(".");
    print(node.property);
  }
}

function MetaProperty(node, print) {
  print(node.meta);
  this.push(".");
  print(node.property);
}
},{"../../types":167,"is-integer":315,"lodash/lang/isNumber":408}],28:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.AnyTypeAnnotation = AnyTypeAnnotation;
exports.ArrayTypeAnnotation = ArrayTypeAnnotation;
exports.BooleanTypeAnnotation = BooleanTypeAnnotation;
exports.DeclareClass = DeclareClass;
exports.DeclareFunction = DeclareFunction;
exports.DeclareModule = DeclareModule;
exports.DeclareVariable = DeclareVariable;
exports.FunctionTypeAnnotation = FunctionTypeAnnotation;
exports.FunctionTypeParam = FunctionTypeParam;
exports.InterfaceExtends = InterfaceExtends;
exports._interfaceish = _interfaceish;
exports.InterfaceDeclaration = InterfaceDeclaration;
exports.IntersectionTypeAnnotation = IntersectionTypeAnnotation;
exports.NullableTypeAnnotation = NullableTypeAnnotation;
exports.NumberTypeAnnotation = NumberTypeAnnotation;
exports.StringLiteralTypeAnnotation = StringLiteralTypeAnnotation;
exports.StringTypeAnnotation = StringTypeAnnotation;
exports.TupleTypeAnnotation = TupleTypeAnnotation;
exports.TypeofTypeAnnotation = TypeofTypeAnnotation;
exports.TypeAlias = TypeAlias;
exports.TypeAnnotation = TypeAnnotation;
exports.TypeParameterInstantiation = TypeParameterInstantiation;
exports.ObjectTypeAnnotation = ObjectTypeAnnotation;
exports.ObjectTypeCallProperty = ObjectTypeCallProperty;
exports.ObjectTypeIndexer = ObjectTypeIndexer;
exports.ObjectTypeProperty = ObjectTypeProperty;
exports.QualifiedTypeIdentifier = QualifiedTypeIdentifier;
exports.UnionTypeAnnotation = UnionTypeAnnotation;
exports.TypeCastExpression = TypeCastExpression;
exports.VoidTypeAnnotation = VoidTypeAnnotation;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function AnyTypeAnnotation() {
  this.push("any");
}

function ArrayTypeAnnotation(node, print) {
  print(node.elementType);
  this.push("[");
  this.push("]");
}

function BooleanTypeAnnotation(node) {
  this.push("bool");
}

function DeclareClass(node, print) {
  this.push("declare class ");
  this._interfaceish(node, print);
}

function DeclareFunction(node, print) {
  this.push("declare function ");
  print(node.id);
  print(node.id.typeAnnotation.typeAnnotation);
  this.semicolon();
}

function DeclareModule(node, print) {
  this.push("declare module ");
  print(node.id);
  this.space();
  print(node.body);
}

function DeclareVariable(node, print) {
  this.push("declare var ");
  print(node.id);
  print(node.id.typeAnnotation);
  this.semicolon();
}

function FunctionTypeAnnotation(node, print, parent) {
  print(node.typeParameters);
  this.push("(");
  print.list(node.params);

  if (node.rest) {
    if (node.params.length) {
      this.push(",");
      this.space();
    }
    this.push("...");
    print(node.rest);
  }

  this.push(")");

  // this node type is overloaded, not sure why but it makes it EXTREMELY annoying
  if (parent.type === "ObjectTypeProperty" || parent.type === "ObjectTypeCallProperty" || parent.type === "DeclareFunction") {
    this.push(":");
  } else {
    this.space();
    this.push("=>");
  }

  this.space();
  print(node.returnType);
}

function FunctionTypeParam(node, print) {
  print(node.name);
  if (node.optional) this.push("?");
  this.push(":");
  this.space();
  print(node.typeAnnotation);
}

function InterfaceExtends(node, print) {
  print(node.id);
  print(node.typeParameters);
}

exports.ClassImplements = InterfaceExtends;
exports.GenericTypeAnnotation = InterfaceExtends;

function _interfaceish(node, print) {
  print(node.id);
  print(node.typeParameters);
  if (node["extends"].length) {
    this.push(" extends ");
    print.join(node["extends"], { separator: ", " });
  }
  this.space();
  print(node.body);
}

function InterfaceDeclaration(node, print) {
  this.push("interface ");
  this._interfaceish(node, print);
}

function IntersectionTypeAnnotation(node, print) {
  print.join(node.types, { separator: " & " });
}

function NullableTypeAnnotation(node, print) {
  this.push("?");
  print(node.typeAnnotation);
}

function NumberTypeAnnotation() {
  this.push("number");
}

function StringLiteralTypeAnnotation(node) {
  this._stringLiteral(node.value);
}

function StringTypeAnnotation() {
  this.push("string");
}

function TupleTypeAnnotation(node, print) {
  this.push("[");
  print.join(node.types, { separator: ", " });
  this.push("]");
}

function TypeofTypeAnnotation(node, print) {
  this.push("typeof ");
  print(node.argument);
}

function TypeAlias(node, print) {
  this.push("type ");
  print(node.id);
  print(node.typeParameters);
  this.space();
  this.push("=");
  this.space();
  print(node.right);
  this.semicolon();
}

function TypeAnnotation(node, print) {
  this.push(":");
  this.space();
  if (node.optional) this.push("?");
  print(node.typeAnnotation);
}

function TypeParameterInstantiation(node, print) {
  this.push("<");
  print.join(node.params, { separator: ", " });
  this.push(">");
}

exports.TypeParameterDeclaration = TypeParameterInstantiation;

function ObjectTypeAnnotation(node, print) {
  var _this = this;

  this.push("{");
  var props = node.properties.concat(node.callProperties, node.indexers);

  if (props.length) {
    this.space();

    print.list(props, {
      separator: false,
      indent: true,
      iterator: function iterator() {
        if (props.length !== 1) {
          _this.semicolon();
          _this.space();
        }
      }
    });

    this.space();
  }

  this.push("}");
}

function ObjectTypeCallProperty(node, print) {
  if (node["static"]) this.push("static ");
  print(node.value);
}

function ObjectTypeIndexer(node, print) {
  if (node["static"]) this.push("static ");
  this.push("[");
  print(node.id);
  this.push(":");
  this.space();
  print(node.key);
  this.push("]");
  this.push(":");
  this.space();
  print(node.value);
}

function ObjectTypeProperty(node, print) {
  if (node["static"]) this.push("static ");
  print(node.key);
  if (node.optional) this.push("?");
  if (!t.isFunctionTypeAnnotation(node.value)) {
    this.push(":");
    this.space();
  }
  print(node.value);
}

function QualifiedTypeIdentifier(node, print) {
  print(node.qualification);
  this.push(".");
  print(node.id);
}

function UnionTypeAnnotation(node, print) {
  print.join(node.types, { separator: " | " });
}

function TypeCastExpression(node, print) {
  this.push("(");
  print(node.expression);
  print(node.typeAnnotation);
  this.push(")");
}

function VoidTypeAnnotation(node) {
  this.push("void");
}
},{"../../types":167}],29:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.JSXAttribute = JSXAttribute;
exports.JSXIdentifier = JSXIdentifier;
exports.JSXNamespacedName = JSXNamespacedName;
exports.JSXMemberExpression = JSXMemberExpression;
exports.JSXSpreadAttribute = JSXSpreadAttribute;
exports.JSXExpressionContainer = JSXExpressionContainer;
exports.JSXElement = JSXElement;
exports.JSXOpeningElement = JSXOpeningElement;
exports.JSXClosingElement = JSXClosingElement;
exports.JSXEmptyExpression = JSXEmptyExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function JSXAttribute(node, print) {
  print(node.name);
  if (node.value) {
    this.push("=");
    print(node.value);
  }
}

function JSXIdentifier(node) {
  this.push(node.name);
}

function JSXNamespacedName(node, print) {
  print(node.namespace);
  this.push(":");
  print(node.name);
}

function JSXMemberExpression(node, print) {
  print(node.object);
  this.push(".");
  print(node.property);
}

function JSXSpreadAttribute(node, print) {
  this.push("{...");
  print(node.argument);
  this.push("}");
}

function JSXExpressionContainer(node, print) {
  this.push("{");
  print(node.expression);
  this.push("}");
}

function JSXElement(node, print) {
  var open = node.openingElement;
  print(open);
  if (open.selfClosing) return;

  this.indent();
  var _arr = node.children;
  for (var _i = 0; _i < _arr.length; _i++) {
    var child = _arr[_i];
    if (t.isLiteral(child)) {
      this.push(child.value, true);
    } else {
      print(child);
    }
  }
  this.dedent();

  print(node.closingElement);
}

function JSXOpeningElement(node, print) {
  this.push("<");
  print(node.name);
  if (node.attributes.length > 0) {
    this.push(" ");
    print.join(node.attributes, { separator: " " });
  }
  this.push(node.selfClosing ? " />" : ">");
}

function JSXClosingElement(node, print) {
  this.push("</");
  print(node.name);
  this.push(">");
}

function JSXEmptyExpression() {}
},{"../../types":167,"lodash/collection/each":328}],30:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports._params = _params;
exports._method = _method;
exports.FunctionExpression = FunctionExpression;
exports.ArrowFunctionExpression = ArrowFunctionExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function _params(node, print) {
  var _this = this;

  print(node.typeParameters);
  this.push("(");
  print.list(node.params, {
    iterator: function iterator(node) {
      if (node.optional) _this.push("?");
      print(node.typeAnnotation);
    }
  });
  this.push(")");

  if (node.returnType) {
    print(node.returnType);
  }
}

function _method(node, print) {
  var value = node.value;
  var kind = node.kind;
  var key = node.key;

  if (kind === "method" || kind === "init") {
    if (value.generator) {
      this.push("*");
    }
  }

  if (kind === "get" || kind === "set") {
    this.push(kind + " ");
  }

  if (value.async) this.push("async ");

  if (node.computed) {
    this.push("[");
    print(key);
    this.push("]");
  } else {
    print(key);
  }

  this._params(value, print);
  this.push(" ");
  print(value.body);
}

function FunctionExpression(node, print) {
  if (node.async) this.push("async ");
  this.push("function");
  if (node.generator) this.push("*");

  if (node.id) {
    this.push(" ");
    print(node.id);
  } else {
    this.space();
  }

  this._params(node, print);
  this.space();
  print(node.body);
}

exports.FunctionDeclaration = FunctionExpression;

function ArrowFunctionExpression(node, print) {
  if (node.async) this.push("async ");

  if (node.params.length === 1 && t.isIdentifier(node.params[0])) {
    print(node.params[0]);
  } else {
    this._params(node, print);
  }

  this.push(" => ");

  var bodyNeedsParens = t.isObjectExpression(node.body);

  if (bodyNeedsParens) {
    this.push("(");
  }

  print(node.body);

  if (bodyNeedsParens) {
    this.push(")");
  }
}
},{"../../types":167}],31:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ImportSpecifier = ImportSpecifier;
exports.ImportDefaultSpecifier = ImportDefaultSpecifier;
exports.ExportDefaultSpecifier = ExportDefaultSpecifier;
exports.ExportSpecifier = ExportSpecifier;
exports.ExportNamespaceSpecifier = ExportNamespaceSpecifier;
exports.ExportAllDeclaration = ExportAllDeclaration;
exports.ExportNamedDeclaration = ExportNamedDeclaration;
exports.ExportDefaultDeclaration = ExportDefaultDeclaration;
exports.ImportDeclaration = ImportDeclaration;
exports.ImportNamespaceSpecifier = ImportNamespaceSpecifier;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function ImportSpecifier(node, print) {
  print(node.imported);
  if (node.local && node.local.name !== node.imported.name) {
    this.push(" as ");
    print(node.local);
  }
}

function ImportDefaultSpecifier(node, print) {
  print(node.local);
}

function ExportDefaultSpecifier(node, print) {
  print(node.exported);
}

function ExportSpecifier(node, print) {
  print(node.local);
  if (node.exported && node.local.name !== node.exported.name) {
    this.push(" as ");
    print(node.exported);
  }
}

function ExportNamespaceSpecifier(node, print) {
  this.push("* as ");
  print(node.exported);
}

function ExportAllDeclaration(node, print) {
  this.push("export *");
  if (node.exported) {
    this.push(" as ");
    print(node.exported);
  }
  this.push(" from ");
  print(node.source);
  this.semicolon();
}

function ExportNamedDeclaration(node, print) {
  this.push("export ");
  ExportDeclaration.call(this, node, print);
}

function ExportDefaultDeclaration(node, print) {
  this.push("export default ");
  ExportDeclaration.call(this, node, print);
}

function ExportDeclaration(node, print) {
  var specifiers = node.specifiers;

  if (node.declaration) {
    var declar = node.declaration;
    print(declar);
    if (t.isStatement(declar) || t.isFunction(declar) || t.isClass(declar)) return;
  } else {
    var first = specifiers[0];
    var hasSpecial = false;
    if (t.isExportDefaultSpecifier(first) || t.isExportNamespaceSpecifier(first)) {
      hasSpecial = true;
      print(specifiers.shift());
      if (specifiers.length) {
        this.push(", ");
      }
    }

    if (specifiers.length || !specifiers.length && !hasSpecial) {
      this.push("{");
      if (specifiers.length) {
        this.space();
        print.join(specifiers, { separator: ", " });
        this.space();
      }
      this.push("}");
    }

    if (node.source) {
      this.push(" from ");
      print(node.source);
    }
  }

  this.ensureSemicolon();
}

function ImportDeclaration(node, print) {
  this.push("import ");

  if (node.isType) {
    this.push("type ");
  }

  var specfiers = node.specifiers;
  if (specfiers && specfiers.length) {
    var first = node.specifiers[0];
    if (t.isImportDefaultSpecifier(first) || t.isImportNamespaceSpecifier(first)) {
      print(node.specifiers.shift());
      if (node.specifiers.length) {
        this.push(", ");
      }
    }

    if (node.specifiers.length) {
      this.push("{");
      this.space();
      print.join(node.specifiers, { separator: ", " });
      this.space();
      this.push("}");
    }

    this.push(" from ");
  }

  print(node.source);
  this.semicolon();
}

function ImportNamespaceSpecifier(node, print) {
  this.push("* as ");
  print(node.local);
}
},{"../../types":167,"lodash/collection/each":328}],32:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.WithStatement = WithStatement;
exports.IfStatement = IfStatement;
exports.ForStatement = ForStatement;
exports.WhileStatement = WhileStatement;
exports.DoWhileStatement = DoWhileStatement;
exports.LabeledStatement = LabeledStatement;
exports.TryStatement = TryStatement;
exports.CatchClause = CatchClause;
exports.ThrowStatement = ThrowStatement;
exports.SwitchStatement = SwitchStatement;
exports.SwitchCase = SwitchCase;
exports.DebuggerStatement = DebuggerStatement;
exports.VariableDeclaration = VariableDeclaration;
exports.VariableDeclarator = VariableDeclarator;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _repeating = require("repeating");

var _repeating2 = _interopRequireDefault(_repeating);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function WithStatement(node, print) {
  this.keyword("with");
  this.push("(");
  print(node.object);
  this.push(")");
  print.block(node.body);
}

function IfStatement(node, print) {
  this.keyword("if");
  this.push("(");
  print(node.test);
  this.push(")");
  this.space();

  print.indentOnComments(node.consequent);

  if (node.alternate) {
    if (this.isLast("}")) this.space();
    this.push("else ");
    print.indentOnComments(node.alternate);
  }
}

function ForStatement(node, print) {
  this.keyword("for");
  this.push("(");

  print(node.init);
  this.push(";");

  if (node.test) {
    this.push(" ");
    print(node.test);
  }
  this.push(";");

  if (node.update) {
    this.push(" ");
    print(node.update);
  }

  this.push(")");
  print.block(node.body);
}

function WhileStatement(node, print) {
  this.keyword("while");
  this.push("(");
  print(node.test);
  this.push(")");
  print.block(node.body);
}

var buildForXStatement = function buildForXStatement(op) {
  return function (node, print) {
    this.keyword("for");
    this.push("(");
    print(node.left);
    this.push(" " + op + " ");
    print(node.right);
    this.push(")");
    print.block(node.body);
  };
};

var ForInStatement = buildForXStatement("in");
exports.ForInStatement = ForInStatement;
var ForOfStatement = buildForXStatement("of");

exports.ForOfStatement = ForOfStatement;

function DoWhileStatement(node, print) {
  this.push("do ");
  print(node.body);
  this.space();
  this.keyword("while");
  this.push("(");
  print(node.test);
  this.push(");");
}

var buildLabelStatement = function buildLabelStatement(prefix, key) {
  return function (node, print) {
    this.push(prefix);

    var label = node[key || "label"];
    if (label) {
      this.push(" ");
      print(label);
    }

    this.semicolon();
  };
};

var ContinueStatement = buildLabelStatement("continue");
exports.ContinueStatement = ContinueStatement;
var ReturnStatement = buildLabelStatement("return", "argument");
exports.ReturnStatement = ReturnStatement;
var BreakStatement = buildLabelStatement("break");

exports.BreakStatement = BreakStatement;

function LabeledStatement(node, print) {
  print(node.label);
  this.push(": ");
  print(node.body);
}

function TryStatement(node, print) {
  this.keyword("try");
  print(node.block);
  this.space();

  // Esprima bug puts the catch clause in a `handlers` array.
  // see https://code.google.com/p/esprima/issues/detail?id=433
  // We run into this from regenerator generated ast.
  if (node.handlers) {
    print(node.handlers[0]);
  } else {
    print(node.handler);
  }

  if (node.finalizer) {
    this.space();
    this.push("finally ");
    print(node.finalizer);
  }
}

function CatchClause(node, print) {
  this.keyword("catch");
  this.push("(");
  print(node.param);
  this.push(") ");
  print(node.body);
}

function ThrowStatement(node, print) {
  this.push("throw ");
  print(node.argument);
  this.semicolon();
}

function SwitchStatement(node, print) {
  this.keyword("switch");
  this.push("(");
  print(node.discriminant);
  this.push(")");
  this.space();
  this.push("{");

  print.sequence(node.cases, {
    indent: true,
    addNewlines: function addNewlines(leading, cas) {
      if (!leading && node.cases[node.cases.length - 1] === cas) return -1;
    }
  });

  this.push("}");
}

function SwitchCase(node, print) {
  if (node.test) {
    this.push("case ");
    print(node.test);
    this.push(":");
  } else {
    this.push("default:");
  }

  if (node.consequent.length) {
    this.newline();
    print.sequence(node.consequent, { indent: true });
  }
}

function DebuggerStatement() {
  this.push("debugger;");
}

function VariableDeclaration(node, print, parent) {
  this.push(node.kind + " ");

  var hasInits = false;
  // don't add whitespace to loop heads
  if (!t.isFor(parent)) {
    var _arr = node.declarations;

    for (var _i = 0; _i < _arr.length; _i++) {
      var declar = _arr[_i];
      if (declar.init) {
        // has an init so let's split it up over multiple lines
        hasInits = true;
      }
    }
  }

  var sep = ",";
  if (!this.format.compact && !this.format.concise && hasInits && !this.format.retainLines) {
    sep += "\n" + (0, _repeating2["default"])(" ", node.kind.length + 1);
  } else {
    sep += " ";
  }

  print.list(node.declarations, { separator: sep });

  if (t.isFor(parent)) {
    if (parent.left === node || parent.init === node) return;
  }

  this.semicolon();
}

function VariableDeclarator(node, print) {
  print(node.id);
  print(node.id.typeAnnotation);
  if (node.init) {
    this.space();
    this.push("=");
    this.space();
    print(node.init);
  }
}
},{"../../types":167,"repeating":476}],33:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.TaggedTemplateExpression = TaggedTemplateExpression;
exports.TemplateElement = TemplateElement;
exports.TemplateLiteral = TemplateLiteral;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

function TaggedTemplateExpression(node, print) {
  print(node.tag);
  print(node.quasi);
}

function TemplateElement(node) {
  this._push(node.value.raw);
}

function TemplateLiteral(node, print) {
  this.push("`");

  var quasis = node.quasis;
  var len = quasis.length;

  for (var i = 0; i < len; i++) {
    print(quasis[i]);

    if (i + 1 < len) {
      this.push("${ ");
      print(node.expressions[i]);
      this.push(" }");
    }
  }

  this._push("`");
}
},{"lodash/collection/each":328}],34:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Identifier = Identifier;
exports.RestElement = RestElement;
exports.ObjectExpression = ObjectExpression;
exports.Property = Property;
exports.ArrayExpression = ArrayExpression;
exports.Literal = Literal;
exports._stringLiteral = _stringLiteral;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function Identifier(node) {
  this.push(node.name);
}

function RestElement(node, print) {
  this.push("...");
  print(node.argument);
}

exports.SpreadElement = RestElement;
exports.SpreadProperty = RestElement;

function ObjectExpression(node, print) {
  var props = node.properties;

  if (props.length) {
    this.push("{");
    this.space();

    print.list(props, { indent: true });

    this.space();
    this.push("}");
  } else {
    this.push("{}");
  }
}

exports.ObjectPattern = ObjectExpression;

function Property(node, print) {
  if (node.method || node.kind === "get" || node.kind === "set") {
    this._method(node, print);
  } else {
    if (node.computed) {
      this.push("[");
      print(node.key);
      this.push("]");
    } else {
      print(node.key);

      // shorthand!
      if (node.shorthand && (t.isIdentifier(node.key) && t.isIdentifier(node.value) && node.key.name === node.value.name)) {
        return;
      }
    }

    this.push(":");
    this.space();
    print(node.value);
  }
}

function ArrayExpression(node, print) {
  var elems = node.elements;
  var len = elems.length;

  this.push("[");

  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    if (!elem) {
      // If the array expression ends with a hole, that hole
      // will be ignored by the interpreter, but if it ends with
      // two (or more) holes, we need to write out two (or more)
      // commas so that the resulting code is interpreted with
      // both (all) of the holes.
      this.push(",");
    } else {
      if (i > 0) this.push(" ");
      print(elem);
      if (i < len - 1) this.push(",");
    }
  }

  this.push("]");
}

exports.ArrayPattern = ArrayExpression;

function Literal(node) {
  var val = node.value;
  var type = typeof val;

  if (type === "string") {
    this._stringLiteral(val);
  } else if (type === "number") {
    this.push(val + "");
  } else if (type === "boolean") {
    this.push(val ? "true" : "false");
  } else if (node.regex) {
    this.push("/" + node.regex.pattern + "/" + node.regex.flags);
  } else if (val === null) {
    this.push("null");
  }
}

function _stringLiteral(val) {
  val = JSON.stringify(val);

  // escape illegal js but valid json unicode characters
  val = val.replace(/[\u000A\u000D\u2028\u2029]/g, function (c) {
    return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
  });

  if (this.format.quotes === "single") {
    val = val.slice(1, -1);
    val = val.replace(/\\"/g, "\"");
    val = val.replace(/'/g, "\\'");
    val = "'" + val + "'";
  }

  this.push(val);
}
},{"../../types":167,"lodash/collection/each":328}],35:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _detectIndent = require("detect-indent");

var _detectIndent2 = _interopRequireDefault(_detectIndent);

var _whitespace = require("./whitespace");

var _whitespace2 = _interopRequireDefault(_whitespace);

var _repeating = require("repeating");

var _repeating2 = _interopRequireDefault(_repeating);

var _sourceMap = require("./source-map");

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _position = require("./position");

var _position2 = _interopRequireDefault(_position);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _buffer = require("./buffer");

var _buffer2 = _interopRequireDefault(_buffer);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _node = require("./node");

var _node2 = _interopRequireDefault(_node);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var CodeGenerator = (function () {
  function CodeGenerator(ast, opts, code) {
    _classCallCheck(this, CodeGenerator);

    opts = opts || {};

    this.comments = ast.comments || [];
    this.tokens = ast.tokens || [];
    this.format = CodeGenerator.normalizeOptions(code, opts, this.tokens);
    this.opts = opts;
    this.ast = ast;

    this.whitespace = new _whitespace2["default"](this.tokens, this.comments, this.format);
    this.position = new _position2["default"]();
    this.map = new _sourceMap2["default"](this.position, opts, code);
    this.buffer = new _buffer2["default"](this.position, this.format);
  }

  CodeGenerator.normalizeOptions = function normalizeOptions(code, opts, tokens) {
    var style = "  ";
    if (code) {
      var indent = (0, _detectIndent2["default"])(code).indent;
      if (indent && indent !== " ") style = indent;
    }

    var format = {
      retainLines: opts.retainLines,
      comments: opts.comments == null || opts.comments,
      compact: opts.compact,
      quotes: CodeGenerator.findCommonStringDelimiter(code, tokens),
      indent: {
        adjustMultilineComment: true,
        style: style,
        base: 0
      }
    };

    if (format.compact === "auto") {
      format.compact = code.length > 100000; // 100KB

      if (format.compact) {
        console.error("[BABEL] " + messages.get("codeGeneratorDeopt", opts.filename, "100KB"));
      }
    }

    return format;
  };

  CodeGenerator.findCommonStringDelimiter = function findCommonStringDelimiter(code, tokens) {
    var occurences = {
      single: 0,
      double: 0
    };

    var checked = 0;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token.type.label !== "string") continue;
      if (checked >= 3) continue;

      var raw = code.slice(token.start, token.end);
      if (raw[0] === "'") {
        occurences.single++;
      } else {
        occurences.double++;
      }

      checked++;
    }

    if (occurences.single > occurences.double) {
      return "single";
    } else {
      return "double";
    }
  };

  CodeGenerator.prototype.generate = function generate() {
    var ast = this.ast;

    this.print(ast);

    if (ast.comments) {
      var comments = [];
      var _arr = ast.comments;
      for (var _i = 0; _i < _arr.length; _i++) {
        var comment = _arr[_i];
        if (!comment._displayed) comments.push(comment);
      }
      this._printComments(comments);
    }

    return {
      map: this.map.get(),
      code: this.buffer.get()
    };
  };

  CodeGenerator.prototype.buildPrint = function buildPrint(parent) {
    var _this = this;

    var print = function print(node, opts) {
      return _this.print(node, parent, opts);
    };

    print.sequence = function (nodes) {
      var opts = arguments[1] === undefined ? {} : arguments[1];

      opts.statement = true;
      return _this.printJoin(print, nodes, opts);
    };

    print.join = function (nodes, opts) {
      return _this.printJoin(print, nodes, opts);
    };

    print.list = function (items) {
      var opts = arguments[1] === undefined ? {} : arguments[1];

      if (opts.separator == null) opts.separator = ", ";
      print.join(items, opts);
    };

    print.block = function (node) {
      return _this.printBlock(print, node);
    };

    print.indentOnComments = function (node) {
      return _this.printAndIndentOnComments(print, node);
    };

    return print;
  };

  CodeGenerator.prototype.catchUp = function catchUp(node, parent) {
    // catch up to this nodes newline if we're behind
    if (node.loc && this.format.retainLines && this.buffer.buf) {
      var needsParens = false;
      if (parent && this.position.line < node.loc.start.line && t.isTerminatorless(parent)) {
        needsParens = true;
        this._push("(");
      }
      while (this.position.line < node.loc.start.line) {
        this._push("\n");
      }
      return needsParens;
    }
    return false;
  };

  CodeGenerator.prototype.print = function print(node, parent) {
    var _this2 = this;

    var opts = arguments[2] === undefined ? {} : arguments[2];

    if (!node) return;

    if (parent && parent._compact) {
      node._compact = true;
    }

    var oldConcise = this.format.concise;
    if (node._compact) {
      this.format.concise = true;
    }

    var newline = function newline(leading) {
      if (!opts.statement && !_node2["default"].isUserWhitespacable(node, parent)) {
        return;
      }

      var lines = 0;

      if (node.start != null && !node._ignoreUserWhitespace) {
        // user node
        if (leading) {
          lines = _this2.whitespace.getNewlinesBefore(node);
        } else {
          lines = _this2.whitespace.getNewlinesAfter(node);
        }
      } else {
        // generated node
        if (!leading) lines++; // always include at least a single line after
        if (opts.addNewlines) lines += opts.addNewlines(leading, node) || 0;

        var needs = _node2["default"].needsWhitespaceAfter;
        if (leading) needs = _node2["default"].needsWhitespaceBefore;
        if (needs(node, parent)) lines++;

        // generated nodes can't add starting file whitespace
        if (!_this2.buffer.buf) lines = 0;
      }

      _this2.newline(lines);
    };

    if (this[node.type]) {
      var needsNoLineTermParens = _node2["default"].needsParensNoLineTerminator(node, parent);
      var needsParens = needsNoLineTermParens || _node2["default"].needsParens(node, parent);

      if (needsParens) this.push("(");
      if (needsNoLineTermParens) this.indent();

      this.printLeadingComments(node, parent);

      var needsParensFromCatchup = this.catchUp(node, parent);

      newline(true);

      if (opts.before) opts.before();
      this.map.mark(node, "start");

      this[node.type](node, this.buildPrint(node), parent);

      if (needsNoLineTermParens) {
        this.newline();
        this.dedent();
      }
      if (needsParens || needsParensFromCatchup) this.push(")");

      this.map.mark(node, "end");
      if (opts.after) opts.after();

      this.format.concise = oldConcise;

      newline(false);

      this.printTrailingComments(node, parent);
    } else {
      throw new ReferenceError("unknown node of type " + JSON.stringify(node.type) + " with constructor " + JSON.stringify(node && node.constructor.name));
    }
  };

  CodeGenerator.prototype.printJoin = function printJoin(print, nodes) {
    var _this3 = this;

    var opts = arguments[2] === undefined ? {} : arguments[2];

    if (!nodes || !nodes.length) return;

    var len = nodes.length;

    if (opts.indent) this.indent();

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      print(node, {
        statement: opts.statement,
        addNewlines: opts.addNewlines,
        after: function after() {
          if (opts.iterator) {
            opts.iterator(node, i);
          }

          if (opts.separator && i < len - 1) {
            _this3.push(opts.separator);
          }
        }
      });
    }

    if (opts.indent) this.dedent();
  };

  CodeGenerator.prototype.printAndIndentOnComments = function printAndIndentOnComments(print, node) {
    var indent = !!node.leadingComments;
    if (indent) this.indent();
    print(node);
    if (indent) this.dedent();
  };

  CodeGenerator.prototype.printBlock = function printBlock(print, node) {
    if (t.isEmptyStatement(node)) {
      this.semicolon();
    } else {
      this.push(" ");
      print(node);
    }
  };

  CodeGenerator.prototype.generateComment = function generateComment(comment) {
    var val = comment.value;
    if (comment.type === "Line") {
      val = "//" + val;
    } else {
      val = "/*" + val + "*/";
    }
    return val;
  };

  CodeGenerator.prototype.printTrailingComments = function printTrailingComments(node, parent) {
    this._printComments(this.getComments("trailingComments", node, parent));
  };

  CodeGenerator.prototype.printLeadingComments = function printLeadingComments(node, parent) {
    this._printComments(this.getComments("leadingComments", node, parent));
  };

  CodeGenerator.prototype.getComments = function getComments(key, node, parent) {
    if (t.isExpressionStatement(parent)) {
      return [];
    }

    var comments = [];
    var nodes = [node];

    if (t.isExpressionStatement(node)) {
      nodes.push(node.argument);
    }

    var _arr2 = nodes;
    for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
      var node = _arr2[_i2];
      comments = comments.concat(this._getComments(key, node));
    }

    return comments;
  };

  CodeGenerator.prototype._getComments = function _getComments(key, node) {
    return node && node[key] || [];
  };

  CodeGenerator.prototype._printComments = function _printComments(comments) {
    if (this.format.compact) return;

    if (!this.format.comments) return;
    if (!comments || !comments.length) return;

    var _arr3 = comments;
    for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
      var comment = _arr3[_i3];
      var skip = false;

      if (this.ast.comments) {
        // find the original comment in the ast and set it as displayed
        var _arr4 = this.ast.comments;
        for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
          var origComment = _arr4[_i4];
          if (origComment.start === comment.start) {
            // comment has already been output
            if (origComment._displayed) skip = true;

            origComment._displayed = true;
            break;
          }
        }
      }

      if (skip) return;

      this.catchUp(comment);

      // whitespace before
      this.newline(this.whitespace.getNewlinesBefore(comment));

      var column = this.position.column;
      var val = this.generateComment(comment);

      if (column && !this.isLast(["\n", " ", "[", "{"])) {
        this._push(" ");
        column++;
      }

      //
      if (comment.type === "Block" && this.format.indent.adjustMultilineComment) {
        var offset = comment.loc.start.column;
        if (offset) {
          var newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
          val = val.replace(newlineRegex, "\n");
        }

        var indent = Math.max(this.indentSize(), column);
        val = val.replace(/\n/g, "\n" + (0, _repeating2["default"])(" ", indent));
      }

      if (column === 0) {
        val = this.getIndent() + val;
      }

      // force a newline for line comments when retainLines is set in case the next printed node
      // doesn't catch up
      if (this.format.retainLines && comment.type === "Line") {
        val += "\n";
      }

      //
      this._push(val);

      // whitespace after
      this.newline(this.whitespace.getNewlinesAfter(comment));
    }
  };

  _createClass(CodeGenerator, null, [{
    key: "generators",
    value: {
      templateLiterals: require("./generators/template-literals"),
      comprehensions: require("./generators/comprehensions"),
      expressions: require("./generators/expressions"),
      statements: require("./generators/statements"),
      classes: require("./generators/classes"),
      methods: require("./generators/methods"),
      modules: require("./generators/modules"),
      types: require("./generators/types"),
      flow: require("./generators/flow"),
      base: require("./generators/base"),
      jsx: require("./generators/jsx")
    },
    enumerable: true
  }]);

  return CodeGenerator;
})();

(0, _lodashCollectionEach2["default"])(_buffer2["default"].prototype, function (fn, key) {
  CodeGenerator.prototype[key] = function () {
    return fn.apply(this.buffer, arguments);
  };
});

(0, _lodashCollectionEach2["default"])(CodeGenerator.generators, function (generator) {
  (0, _lodashObjectExtend2["default"])(CodeGenerator.prototype, generator);
});

module.exports = function (ast, opts, code) {
  var gen = new CodeGenerator(ast, opts, code);
  return gen.generate();
};

module.exports.CodeGenerator = CodeGenerator;
},{"../messages":46,"../types":167,"./buffer":23,"./generators/base":24,"./generators/classes":25,"./generators/comprehensions":26,"./generators/expressions":27,"./generators/flow":28,"./generators/jsx":29,"./generators/methods":30,"./generators/modules":31,"./generators/statements":32,"./generators/template-literals":33,"./generators/types":34,"./node":36,"./position":39,"./source-map":40,"./whitespace":41,"detect-indent":304,"lodash/collection/each":328,"lodash/object/extend":417,"repeating":476}],36:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _whitespace = require("./whitespace");

var _whitespace2 = _interopRequireDefault(_whitespace);

var _parentheses = require("./parentheses");

var parens = _interopRequireWildcard(_parentheses);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashCollectionSome = require("lodash/collection/some");

var _lodashCollectionSome2 = _interopRequireDefault(_lodashCollectionSome);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var find = function find(obj, node, parent) {
  if (!obj) return;
  var result;

  var types = Object.keys(obj);
  for (var i = 0; i < types.length; i++) {
    var type = types[i];

    if (t.is(type, node)) {
      var fn = obj[type];
      result = fn(node, parent);
      if (result != null) break;
    }
  }

  return result;
};

var Node = (function () {
  function Node(node, parent) {
    _classCallCheck(this, Node);

    this.parent = parent;
    this.node = node;
  }

  Node.isUserWhitespacable = function isUserWhitespacable(node) {
    return t.isUserWhitespacable(node);
  };

  Node.needsWhitespace = function needsWhitespace(node, parent, type) {
    if (!node) return 0;

    if (t.isExpressionStatement(node)) {
      node = node.expression;
    }

    var linesInfo = find(_whitespace2["default"].nodes, node, parent);

    if (!linesInfo) {
      var items = find(_whitespace2["default"].list, node, parent);
      if (items) {
        for (var i = 0; i < items.length; i++) {
          linesInfo = Node.needsWhitespace(items[i], node, type);
          if (linesInfo) break;
        }
      }
    }

    return linesInfo && linesInfo[type] || 0;
  };

  Node.needsWhitespaceBefore = function needsWhitespaceBefore(node, parent) {
    return Node.needsWhitespace(node, parent, "before");
  };

  Node.needsWhitespaceAfter = function needsWhitespaceAfter(node, parent) {
    return Node.needsWhitespace(node, parent, "after");
  };

  Node.needsParens = function needsParens(node, parent) {
    if (!parent) return false;

    if (t.isNewExpression(parent) && parent.callee === node) {
      if (t.isCallExpression(node)) return true;

      var hasCall = (0, _lodashCollectionSome2["default"])(node, function (val) {
        return t.isCallExpression(val);
      });
      if (hasCall) return true;
    }

    return find(parens, node, parent);
  };

  Node.needsParensNoLineTerminator = function needsParensNoLineTerminator(node, parent) {
    if (!parent) return false;

    // no comments
    if (!node.leadingComments || !node.leadingComments.length) {
      return false;
    }

    return t.isTerminatorless(parent);
  };

  return Node;
})();

exports["default"] = Node;

(0, _lodashCollectionEach2["default"])(Node, function (fn, key) {
  Node.prototype[key] = function () {
    // Avoid leaking arguments to prevent deoptimization
    var args = new Array(arguments.length + 2);

    args[0] = this.node;
    args[1] = this.parent;

    for (var i = 0; i < args.length; i++) {
      args[i + 2] = arguments[i];
    }

    return Node[key].apply(null, args);
  };
});
module.exports = exports["default"];
},{"../../types":167,"./parentheses":37,"./whitespace":38,"lodash/collection/each":328,"lodash/collection/some":333}],37:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.NullableTypeAnnotation = NullableTypeAnnotation;
exports.UpdateExpression = UpdateExpression;
exports.ObjectExpression = ObjectExpression;
exports.Binary = Binary;
exports.BinaryExpression = BinaryExpression;
exports.SequenceExpression = SequenceExpression;
exports.YieldExpression = YieldExpression;
exports.ClassExpression = ClassExpression;
exports.UnaryLike = UnaryLike;
exports.FunctionExpression = FunctionExpression;
exports.ConditionalExpression = ConditionalExpression;
exports.AssignmentExpression = AssignmentExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var PRECEDENCE = {};

(0, _lodashCollectionEach2["default"])([["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "===", "!=", "!=="], ["<", ">", "<=", ">=", "in", "instanceof"], [">>", "<<", ">>>"], ["+", "-"], ["*", "/", "%"], ["**"]], function (tier, i) {
  (0, _lodashCollectionEach2["default"])(tier, function (op) {
    PRECEDENCE[op] = i;
  });
});

function NullableTypeAnnotation(node, parent) {
  return t.isArrayTypeAnnotation(parent);
}

exports.FunctionTypeAnnotation = NullableTypeAnnotation;

function UpdateExpression(node, parent) {
  if (t.isMemberExpression(parent) && parent.object === node) {
    // (foo++).test()
    return true;
  }
}

function ObjectExpression(node, parent) {
  if (t.isExpressionStatement(parent)) {
    // ({ foo: "bar" });
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    // ({ foo: "bar" }).foo
    return true;
  }

  return false;
}

function Binary(node, parent) {
  if ((t.isCallExpression(parent) || t.isNewExpression(parent)) && parent.callee === node) {
    return true;
  }

  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    return true;
  }

  if (t.isBinary(parent)) {
    var parentOp = parent.operator;
    var parentPos = PRECEDENCE[parentOp];

    var nodeOp = node.operator;
    var nodePos = PRECEDENCE[nodeOp];

    if (parentPos > nodePos) {
      return true;
    }

    if (parentPos === nodePos && parent.right === node) {
      return true;
    }
  }
}

function BinaryExpression(node, parent) {
  if (node.operator === "in") {
    // var i = (1 in []);
    if (t.isVariableDeclarator(parent)) {
      return true;
    }

    // for ((1 in []);;);
    if (t.isFor(parent)) {
      return true;
    }
  }
}

function SequenceExpression(node, parent) {
  if (t.isForStatement(parent)) {
    // Although parentheses wouldn't hurt around sequence
    // expressions in the head of for loops, traditional style
    // dictates that e.g. i++, j++ should not be wrapped with
    // parentheses.
    return false;
  }

  if (t.isExpressionStatement(parent) && parent.expression === node) {
    return false;
  }

  // Otherwise err on the side of overparenthesization, adding
  // explicit exceptions above if this proves overzealous.
  return true;
}

function YieldExpression(node, parent) {
  return t.isBinary(parent) || t.isUnaryLike(parent) || t.isCallExpression(parent) || t.isMemberExpression(parent) || t.isNewExpression(parent) || t.isConditionalExpression(parent) || t.isYieldExpression(parent);
}

function ClassExpression(node, parent) {
  return t.isExpressionStatement(parent);
}

function UnaryLike(node, parent) {
  return t.isMemberExpression(parent) && parent.object === node;
}

function FunctionExpression(node, parent) {
  // function () {};
  if (t.isExpressionStatement(parent)) {
    return true;
  }

  // (function test() {}).name;
  if (t.isMemberExpression(parent) && parent.object === node) {
    return true;
  }

  // (function () {})();
  if (t.isCallExpression(parent) && parent.callee === node) {
    return true;
  }
}

function ConditionalExpression(node, parent) {
  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isBinary(parent)) {
    return true;
  }

  if (t.isCallExpression(parent) || t.isNewExpression(parent)) {
    if (parent.callee === node) {
      return true;
    }
  }

  if (t.isConditionalExpression(parent) && parent.test === node) {
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    return true;
  }

  return false;
}

function AssignmentExpression(node) {
  if (t.isObjectPattern(node.left)) {
    return true;
  } else {
    return ConditionalExpression.apply(undefined, arguments);
  }
}
},{"../../types":167,"lodash/collection/each":328}],38:[function(require,module,exports){
"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsBoolean = require("lodash/lang/isBoolean");

var _lodashLangIsBoolean2 = _interopRequireDefault(_lodashLangIsBoolean);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashCollectionMap = require("lodash/collection/map");

var _lodashCollectionMap2 = _interopRequireDefault(_lodashCollectionMap);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function crawl(node) {
  var state = arguments[1] === undefined ? {} : arguments[1];

  if (t.isMemberExpression(node)) {
    crawl(node.object, state);
    if (node.computed) crawl(node.property, state);
  } else if (t.isBinary(node) || t.isAssignmentExpression(node)) {
    crawl(node.left, state);
    crawl(node.right, state);
  } else if (t.isCallExpression(node)) {
    state.hasCall = true;
    crawl(node.callee, state);
  } else if (t.isFunction(node)) {
    state.hasFunction = true;
  } else if (t.isIdentifier(node)) {
    state.hasHelper = state.hasHelper || isHelper(node.callee);
  }

  return state;
}

function isHelper(node) {
  if (t.isMemberExpression(node)) {
    return isHelper(node.object) || isHelper(node.property);
  } else if (t.isIdentifier(node)) {
    return node.name === "require" || node.name[0] === "_";
  } else if (t.isCallExpression(node)) {
    return isHelper(node.callee);
  } else if (t.isBinary(node) || t.isAssignmentExpression(node)) {
    return t.isIdentifier(node.left) && isHelper(node.left) || isHelper(node.right);
  } else {
    return false;
  }
}

function isType(node) {
  return t.isLiteral(node) || t.isObjectExpression(node) || t.isArrayExpression(node) || t.isIdentifier(node) || t.isMemberExpression(node);
}

exports.nodes = {
  AssignmentExpression: function AssignmentExpression(node) {
    var state = crawl(node.right);
    if (state.hasCall && state.hasHelper || state.hasFunction) {
      return {
        before: state.hasFunction,
        after: true
      };
    }
  },

  SwitchCase: function SwitchCase(node, parent) {
    return {
      before: node.consequent.length || parent.cases[0] === node
    };
  },

  LogicalExpression: function LogicalExpression(node) {
    if (t.isFunction(node.left) || t.isFunction(node.right)) {
      return {
        after: true
      };
    }
  },

  Literal: function Literal(node) {
    if (node.value === "use strict") {
      return {
        after: true
      };
    }
  },

  CallExpression: function CallExpression(node) {
    if (t.isFunction(node.callee) || isHelper(node)) {
      return {
        before: true,
        after: true
      };
    }
  },

  VariableDeclaration: function VariableDeclaration(node) {
    for (var i = 0; i < node.declarations.length; i++) {
      var declar = node.declarations[i];

      var enabled = isHelper(declar.id) && !isType(declar.init);
      if (!enabled) {
        var state = crawl(declar.init);
        enabled = isHelper(declar.init) && state.hasCall || state.hasFunction;
      }

      if (enabled) {
        return {
          before: true,
          after: true
        };
      }
    }
  },

  IfStatement: function IfStatement(node) {
    if (t.isBlockStatement(node.consequent)) {
      return {
        before: true,
        after: true
      };
    }
  }
};

exports.nodes.Property = exports.nodes.SpreadProperty = function (node, parent) {
  if (parent.properties[0] === node) {
    return {
      before: true
    };
  }
};

exports.list = {
  VariableDeclaration: function VariableDeclaration(node) {
    return (0, _lodashCollectionMap2["default"])(node.declarations, "init");
  },

  ArrayExpression: function ArrayExpression(node) {
    return node.elements;
  },

  ObjectExpression: function ObjectExpression(node) {
    return node.properties;
  }
};

(0, _lodashCollectionEach2["default"])({
  Function: true,
  Class: true,
  Loop: true,
  LabeledStatement: true,
  SwitchStatement: true,
  TryStatement: true
}, function (amounts, type) {
  if ((0, _lodashLangIsBoolean2["default"])(amounts)) {
    amounts = { after: amounts, before: amounts };
  }

  (0, _lodashCollectionEach2["default"])([type].concat(t.FLIPPED_ALIAS_KEYS[type] || []), function (type) {
    exports.nodes[type] = function () {
      return amounts;
    };
  });
});
},{"../../types":167,"lodash/collection/each":328,"lodash/collection/map":331,"lodash/lang/isBoolean":404}],39:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Position = (function () {
  function Position() {
    _classCallCheck(this, Position);

    this.line = 1;
    this.column = 0;
  }

  Position.prototype.push = function push(str) {
    for (var i = 0; i < str.length; i++) {
      if (str[i] === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
    }
  };

  Position.prototype.unshift = function unshift(str) {
    for (var i = 0; i < str.length; i++) {
      if (str[i] === "\n") {
        this.line--;
      } else {
        this.column--;
      }
    }
  };

  return Position;
})();

exports["default"] = Position;
module.exports = exports["default"];
},{}],40:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _sourceMap = require("source-map");

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var SourceMap = (function () {
  function SourceMap(position, opts, code) {
    _classCallCheck(this, SourceMap);

    this.position = position;
    this.opts = opts;

    if (opts.sourceMaps) {
      this.map = new _sourceMap2["default"].SourceMapGenerator({
        file: opts.sourceMapName,
        sourceRoot: opts.sourceRoot
      });

      this.map.setSourceContent(opts.sourceFileName, code);
    } else {
      this.map = null;
    }
  }

  SourceMap.prototype.get = function get() {
    var map = this.map;
    if (map) {
      return map.toJSON();
    } else {
      return map;
    }
  };

  SourceMap.prototype.mark = function mark(node, type) {
    var loc = node.loc;
    if (!loc) return; // no location info

    var map = this.map;
    if (!map) return; // no source map

    if (t.isProgram(node) || t.isFile(node)) return; // illegal mapping nodes

    var position = this.position;

    var generated = {
      line: position.line,
      column: position.column
    };

    var original = loc[type];

    map.addMapping({
      source: this.opts.sourceFileName,
      generated: generated,
      original: original
    });
  };

  return SourceMap;
})();

exports["default"] = SourceMap;
module.exports = exports["default"];
},{"../types":167,"source-map":480}],41:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodashCollectionSortBy = require("lodash/collection/sortBy");

var _lodashCollectionSortBy2 = _interopRequireDefault(_lodashCollectionSortBy);

/**
 * Returns `i`th number from `base`, continuing from 0 when `max` is reached.
 * Useful for shifting `for` loop by a fixed number but going over all items.
 *
 * @param {Number} i Current index in the loop
 * @param {Number} base Start index for which to return 0
 * @param {Number} max Array length
 * @returns {Number} shiftedIndex
 */

function getLookupIndex(i, base, max) {
  i += base;

  if (i >= max) {
    i -= max;
  }

  return i;
}

var Whitespace = (function () {
  function Whitespace(tokens, comments) {
    _classCallCheck(this, Whitespace);

    this.tokens = (0, _lodashCollectionSortBy2["default"])(tokens.concat(comments), "start");
    this.used = {};

    // Profiling this code shows that while generator passes over it, indexes
    // returned by `getNewlinesBefore` and `getNewlinesAfter` are always increasing.

    // We use this implementation detail for an optimization: instead of always
    // starting to look from `this.tokens[0]`, we will start `for` loops from the
    // previous successful match. We will enumerate all tokens—but the common
    // case will be much faster.

    this._lastFoundIndex = 0;
  }

  Whitespace.prototype.getNewlinesBefore = function getNewlinesBefore(node) {
    var startToken;
    var endToken;
    var tokens = this.tokens;
    var token;

    for (var j = 0; j < tokens.length; j++) {
      // optimize for forward traversal by shifting for loop index
      var i = getLookupIndex(j, this._lastFoundIndex, this.tokens.length);
      token = tokens[i];

      // this is the token this node starts with
      if (node.start === token.start) {
        startToken = tokens[i - 1];
        endToken = token;

        this._lastFoundIndex = i;
        break;
      }
    }

    return this.getNewlinesBetween(startToken, endToken);
  };

  Whitespace.prototype.getNewlinesAfter = function getNewlinesAfter(node) {
    var startToken;
    var endToken;
    var tokens = this.tokens;
    var token;

    for (var j = 0; j < tokens.length; j++) {
      // optimize for forward traversal by shifting for loop index
      var i = getLookupIndex(j, this._lastFoundIndex, this.tokens.length);
      token = tokens[i];

      // this is the token this node ends with
      if (node.end === token.end) {
        startToken = token;
        endToken = tokens[i + 1];

        this._lastFoundIndex = i;
        break;
      }
    }

    if (endToken && endToken.type.label === "eof") {
      return 1;
    } else {
      var lines = this.getNewlinesBetween(startToken, endToken);
      if (node.type === "Line" && !lines) {
        // line comment
        return 1;
      } else {
        return lines;
      }
    }
  };

  Whitespace.prototype.getNewlinesBetween = function getNewlinesBetween(startToken, endToken) {
    if (!endToken || !endToken.loc) return 0;

    var start = startToken ? startToken.loc.end.line : 1;
    var end = endToken.loc.start.line;
    var lines = 0;

    for (var line = start; line < end; line++) {
      if (typeof this.used[line] === "undefined") {
        this.used[line] = true;
        lines++;
      }
    }

    return lines;
  };

  return Whitespace;
})();

exports["default"] = Whitespace;
module.exports = exports["default"];
},{"lodash/collection/sortBy":334}],42:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lineNumbers = require("line-numbers");

var _lineNumbers2 = _interopRequireDefault(_lineNumbers);

var _repeating = require("repeating");

var _repeating2 = _interopRequireDefault(_repeating);

var _jsTokens = require("js-tokens");

var _jsTokens2 = _interopRequireDefault(_jsTokens);

var _esutils = require("esutils");

var _esutils2 = _interopRequireDefault(_esutils);

var _chalk = require("chalk");

var _chalk2 = _interopRequireDefault(_chalk);

var defs = {
  string: _chalk2["default"].red,
  punctuator: _chalk2["default"].bold,
  curly: _chalk2["default"].green,
  parens: _chalk2["default"].blue.bold,
  square: _chalk2["default"].yellow,
  keyword: _chalk2["default"].cyan,
  number: _chalk2["default"].magenta,
  regex: _chalk2["default"].magenta,
  comment: _chalk2["default"].grey,
  invalid: _chalk2["default"].inverse
};

var NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

function getTokenType(match) {
  var token = _jsTokens2["default"].matchToToken(match);
  if (token.type === "name" && _esutils2["default"].keyword.isReservedWordES6(token.value)) {
    return "keyword";
  }

  if (token.type === "punctuator") {
    switch (token.value) {
      case "{":
      case "}":
        return "curly";
      case "(":
      case ")":
        return "parens";
      case "[":
      case "]":
        return "square";
    }
  }

  return token.type;
}

function highlight(text) {
  return text.replace(_jsTokens2["default"], function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var type = getTokenType(args);
    var colorize = defs[type];
    if (colorize) {
      return args[0].split(NEWLINE).map(function (str) {
        return colorize(str);
      }).join("\n");
    } else {
      return args[0];
    }
  });
}

exports["default"] = function (lines, lineNumber, colNumber) {
  var opts = arguments[3] === undefined ? {} : arguments[3];

  colNumber = Math.max(colNumber, 0);

  if (opts.highlightCode && _chalk2["default"].supportsColor) {
    lines = highlight(lines);
  }

  lines = lines.split(NEWLINE);

  var start = Math.max(lineNumber - 3, 0);
  var end = Math.min(lines.length, lineNumber + 3);

  if (!lineNumber && !colNumber) {
    start = 0;
    end = lines.length;
  }

  return (0, _lineNumbers2["default"])(lines.slice(start, end), {
    start: start + 1,
    before: "  ",
    after: " | ",
    transform: function transform(params) {
      if (params.number !== lineNumber) {
        return;
      }
      if (colNumber) {
        params.line += "\n" + params.before + "" + (0, _repeating2["default"])(" ", params.width) + "" + params.after + "" + (0, _repeating2["default"])(" ", colNumber - 1) + "^";
      }
      params.before = params.before.replace(/^./, ">");
    }
  }).join("\n");
};

;
module.exports = exports["default"];
},{"chalk":215,"esutils":312,"js-tokens":318,"line-numbers":320,"repeating":476}],43:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../types");

var t = _interopRequireWildcard(_types);

exports["default"] = function (ast, comments, tokens) {
  if (ast && ast.type === "Program") {
    return t.file(ast, comments || [], tokens || []);
  } else {
    throw new Error("Not a valid ast?");
  }
};

;
module.exports = exports["default"];
},{"../types":167}],44:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports["default"] = function () {
  return Object.create(null);
};

;
module.exports = exports["default"];
},{}],45:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _normalizeAst = require("./normalize-ast");

var _normalizeAst2 = _interopRequireDefault(_normalizeAst);

var _estraverse = require("estraverse");

var _estraverse2 = _interopRequireDefault(_estraverse);

var _acorn = require("../../acorn");

var acorn = _interopRequireWildcard(_acorn);

exports["default"] = function (code) {
  var opts = arguments[1] === undefined ? {} : arguments[1];

  var comments = [];
  var tokens = [];

  var parseOpts = {
    allowImportExportEverywhere: opts.looseModules,
    allowReturnOutsideFunction: opts.looseModules,
    allowHashBang: true,
    ecmaVersion: 6,
    strictMode: opts.strictMode,
    sourceType: opts.sourceType,
    locations: true,
    onComment: comments,
    features: opts.features || {},
    plugins: opts.plugins || {},
    onToken: tokens,
    ranges: true
  };

  if (opts.nonStandard) {
    parseOpts.plugins.jsx = true;
    parseOpts.plugins.flow = true;
  }

  var ast = acorn.parse(code, parseOpts);

  _estraverse2["default"].attachComments(ast, comments, tokens);
  ast = (0, _normalizeAst2["default"])(ast, comments, tokens);
  return ast;
};

module.exports = exports["default"];
},{"../../acorn":1,"./normalize-ast":43,"estraverse":307}],46:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.get = get;
exports.parseArgs = parseArgs;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _util = require("util");

var util = _interopRequireWildcard(_util);

var MESSAGES = {
  tailCallReassignmentDeopt: "Function reference has been reassigned so it's probably be dereferenced so we can't optimise this with confidence",
  JSXNamespacedTags: "Namespace tags are not supported. ReactJSX is not XML.",
  classesIllegalBareSuper: "Illegal use of bare super",
  classesIllegalSuperCall: "Direct super call is illegal in non-constructor, use super.$1() instead",
  classesIllegalConstructorKind: "Illegal kind for constructor method",
  scopeDuplicateDeclaration: "Duplicate declaration $1",
  undeclaredVariable: "Reference to undeclared variable $1",
  undeclaredVariableSuggestion: "Reference to undeclared variable $1 - did you mean $2?",
  settersInvalidParamLength: "Setters must have exactly one parameter",
  settersNoRest: "Setters aren't allowed to have a rest",
  noAssignmentsInForHead: "No assignments allowed in for-in/of head",
  expectedMemberExpressionOrIdentifier: "Expected type MemeberExpression or Identifier",
  invalidParentForThisNode: "We don't know how to handle this node within the current parent - please open an issue",
  readOnly: "$1 is read-only",
  modulesIllegalExportName: "Illegal export $1",
  unknownForHead: "Unknown node type $1 in ForStatement",
  didYouMean: "Did you mean $1?",
  codeGeneratorDeopt: "Note: The code generator has deoptimised the styling of $1 as it exceeds the max of $2.",
  missingTemplatesDirectory: "no templates directory - this is most likely the result of a broken `npm publish`. Please report to https://github.com/babel/babel/issues",
  unsupportedOutputType: "Unsupported output type $1",
  illegalMethodName: "Illegal method name $1",

  traverseNeedsParent: "Must pass a scope and parentPath unless traversing a Program/File got a $1 node",
  traverseVerifyRootFunction: "You passed `traverse()` a function when it expected a visitor object, are you sure you didn't mean `{ enter: Function }`?",
  traverseVerifyVisitorProperty: "You passed `traverse()` a visitor object with the property $1 that has the invalid property $2",
  traverseVerifyNodeType: "You gave us a visitor for the node type $1 but it's not a valid type",

  pluginIllegalKind: "Illegal kind $1 for plugin $2",
  pluginIllegalPosition: "Illegal position $1 for plugin $2",
  pluginKeyCollision: "The plugin $1 collides with another of the same name",
  pluginNotTransformer: "The plugin $1 didn't export a Transformer instance",
  pluginUnknown: "Unknown plugin $1",

  transformerNotFile: "Transformer $1 is resolving to a different Babel version to what is doing the actual transformation..."
};

exports.MESSAGES = MESSAGES;

function get(key) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var msg = MESSAGES[key];
  if (!msg) throw new ReferenceError("Unknown message " + JSON.stringify(key));

  args = parseArgs(args);

  return msg.replace(/\$(\d+)/g, function (str, i) {
    return args[--i];
  });
}

function parseArgs(args) {
  return args.map(function (val) {
    if (val != null && val.inspect) {
      return val.inspect();
    } else {
      try {
        return JSON.stringify(val) || val + "";
      } catch (e) {
        return util.inspect(val);
      }
    }
  });
}
},{"util":214}],47:[function(require,module,exports){
"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _estraverse = require("estraverse");

var _estraverse2 = _interopRequireDefault(_estraverse);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

var _astTypes = require("ast-types");

var _astTypes2 = _interopRequireDefault(_astTypes);

var _types = require("./types");

var t = _interopRequireWildcard(_types);

// estraverse

(0, _lodashObjectExtend2["default"])(_estraverse2["default"].VisitorKeys, t.VISITOR_KEYS);

// regenerator/ast-types

var def = _astTypes2["default"].Type.def;
var or = _astTypes2["default"].Type.or;

//def("File")
//  .bases("Node")
//  .build("program")
//  .field("program", def("Program"));

def("AssignmentPattern").bases("Pattern").build("left", "right").field("left", def("Pattern")).field("right", def("Expression"));

def("RestElement").bases("Pattern").build("argument").field("argument", def("expression"));

def("DoExpression").bases("Expression").build("body").field("body", [def("Statement")]);

def("Super").bases("Expression");

def("ExportDefaultDeclaration").bases("Declaration").build("declaration").field("declaration", or(def("Declaration"), def("Expression"), null));

def("ExportNamedDeclaration").bases("Declaration").build("declaration").field("declaration", or(def("Declaration"), def("Expression"), null)).field("specifiers", [or(def("ExportSpecifier"))]).field("source", or(def("ModuleSpecifier"), null));

def("ExportNamespaceSpecifier").bases("Specifier").field("exported", def("Identifier"));

def("ExportDefaultSpecifier").bases("Specifier").field("exported", def("Identifier"));

def("ExportAllDeclaration").bases("Declaration").build("exported", "source").field("exported", def("Identifier")).field("source", def("Literal"));

_astTypes2["default"].finalize();
},{"./types":167,"ast-types":186,"estraverse":307,"lodash/object/extend":417}],48:[function(require,module,exports){
(function (global){
"use strict";

require("core-js/shim");

require("regenerator/runtime");

if (global._babelPolyfill) {
  throw new Error("only one instance of babel/polyfill is allowed");
}
global._babelPolyfill = true;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"core-js/shim":300,"regenerator/runtime":469}],49:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _generation = require("../generation");

var _generation2 = _interopRequireDefault(_generation);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _util = require("../util");

var util = _interopRequireWildcard(_util);

var _transformationFile = require("../transformation/file");

var _transformationFile2 = _interopRequireDefault(_transformationFile);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

function buildGlobal(namespace, builder) {
  var body = [];
  var container = t.functionExpression(null, [t.identifier("global")], t.blockStatement(body));
  var tree = t.program([t.expressionStatement(t.callExpression(container, [util.template("helper-self-global")]))]);

  body.push(t.variableDeclaration("var", [t.variableDeclarator(namespace, t.assignmentExpression("=", t.memberExpression(t.identifier("global"), namespace), t.objectExpression([])))]));

  builder(body);

  return tree;
}

function buildUmd(namespace, builder) {
  var body = [];
  body.push(t.variableDeclaration("var", [t.variableDeclarator(namespace, t.identifier("global"))]));

  builder(body);

  var container = util.template("umd-commonjs-strict", {
    FACTORY_PARAMETERS: t.identifier("global"),
    BROWSER_ARGUMENTS: t.assignmentExpression("=", t.memberExpression(t.identifier("root"), namespace), t.objectExpression({})),
    COMMON_ARGUMENTS: t.identifier("exports"),
    AMD_ARGUMENTS: t.arrayExpression([t.literal("exports")]),
    FACTORY_BODY: body,
    UMD_ROOT: t.identifier("this")
  });
  return t.program([container]);
}

function buildVar(namespace, builder) {
  var body = [];
  body.push(t.variableDeclaration("var", [t.variableDeclarator(namespace, t.objectExpression({}))]));
  builder(body);
  return t.program(body);
}

function buildHelpers(body, namespace, whitelist) {
  (0, _lodashCollectionEach2["default"])(_transformationFile2["default"].helpers, function (name) {
    if (whitelist && whitelist.indexOf(name) === -1) return;

    var key = t.identifier(t.toIdentifier(name));
    body.push(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(namespace, key), util.template("helper-" + name))));
  });
}

exports["default"] = function (whitelist) {
  var outputType = arguments[1] === undefined ? "global" : arguments[1];

  var namespace = t.identifier("babelHelpers");

  var builder = function builder(body) {
    return buildHelpers(body, namespace, whitelist);
  };

  var tree;

  var build = ({
    global: buildGlobal,
    umd: buildUmd,
    "var": buildVar
  })[outputType];

  if (build) {
    tree = build(namespace, builder);
  } else {
    throw new Error(messages.get("unsupportedOutputType", outputType));
  }

  return (0, _generation2["default"])(tree).code;
};

;
module.exports = exports["default"];
},{"../generation":35,"../messages":46,"../transformation/file":51,"../types":167,"../util":171,"lodash/collection/each":328}],50:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _stripJsonComments = require("strip-json-comments");

var _stripJsonComments2 = _interopRequireDefault(_stripJsonComments);

var _lodashObjectMerge = require("lodash/object/merge");

var _lodashObjectMerge2 = _interopRequireDefault(_lodashObjectMerge);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var cache = {};
var jsons = {};

function exists(filename) {
  if (!_fs2["default"].existsSync) return false;

  var cached = cache[filename];
  if (cached != null) return cached;
  return cache[filename] = _fs2["default"].existsSync(filename);
}

exports["default"] = function (loc) {
  var opts = arguments[1] === undefined ? {} : arguments[1];

  var rel = ".babelrc";

  if (!opts.babelrc) {
    opts.babelrc = [];
  }

  function find(start, rel) {
    var file = _path2["default"].join(start, rel);

    if (opts.babelrc.indexOf(file) >= 0) {
      return;
    }

    if (exists(file)) {
      var content = _fs2["default"].readFileSync(file, "utf8");
      var json;

      try {
        json = jsons[content] = jsons[content] || JSON.parse((0, _stripJsonComments2["default"])(content));
      } catch (err) {
        err.message = "" + file + ": " + err.message;
        throw err;
      }

      opts.babelrc.push(file);

      if (json.breakConfig) return;
      (0, _lodashObjectMerge2["default"])(opts, json, function (a, b) {
        if (Array.isArray(a)) {
          var c = a.slice(0);
          for (var _iterator = b, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
              if (_i >= _iterator.length) break;
              _ref = _iterator[_i++];
            } else {
              _i = _iterator.next();
              if (_i.done) break;
              _ref = _i.value;
            }

            var v = _ref;

            if (a.indexOf(v) < 0) {
              c.push(v);
            }
          }
          return c;
        }
      });
    }

    var up = _path2["default"].dirname(start);
    if (up !== start) {
      // root
      find(up, rel);
    }
  }

  if (opts.babelrc.indexOf(loc) < 0 && opts.breakConfig !== true) {
    find(loc, rel);
  }

  return opts;
};

;
module.exports = exports["default"];
},{"fs":187,"lodash/object/merge":421,"path":197,"strip-json-comments":491}],51:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _convertSourceMap = require("convert-source-map");

var _convertSourceMap2 = _interopRequireDefault(_convertSourceMap);

var _optionParsers = require("./option-parsers");

var optionParsers = _interopRequireWildcard(_optionParsers);

var _modules = require("../modules");

var _modules2 = _interopRequireDefault(_modules);

var _pluginManager = require("./plugin-manager");

var _pluginManager2 = _interopRequireDefault(_pluginManager);

var _shebangRegex = require("shebang-regex");

var _shebangRegex2 = _interopRequireDefault(_shebangRegex);

var _traversalPath = require("../../traversal/path");

var _traversalPath2 = _interopRequireDefault(_traversalPath);

var _transformer = require("../transformer");

var _transformer2 = _interopRequireDefault(_transformer);

var _lodashLangIsFunction = require("lodash/lang/isFunction");

var _lodashLangIsFunction2 = _interopRequireDefault(_lodashLangIsFunction);

var _pathIsAbsolute = require("path-is-absolute");

var _pathIsAbsolute2 = _interopRequireDefault(_pathIsAbsolute);

var _toolsResolveRc = require("../../tools/resolve-rc");

var _toolsResolveRc2 = _interopRequireDefault(_toolsResolveRc);

var _sourceMap = require("source-map");

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _index = require("./../index");

var _index2 = _interopRequireDefault(_index);

var _generation = require("../../generation");

var _generation2 = _interopRequireDefault(_generation);

var _helpersCodeFrame = require("../../helpers/code-frame");

var _helpersCodeFrame2 = _interopRequireDefault(_helpersCodeFrame);

var _lodashObjectDefaults = require("lodash/object/defaults");

var _lodashObjectDefaults2 = _interopRequireDefault(_lodashObjectDefaults);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _traversal = require("../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashObjectAssign = require("lodash/object/assign");

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _logger = require("./logger");

var _logger2 = _interopRequireDefault(_logger);

var _helpersParse = require("../../helpers/parse");

var _helpersParse2 = _interopRequireDefault(_helpersParse);

var _traversalScope = require("../../traversal/scope");

var _traversalScope2 = _interopRequireDefault(_traversalScope);

var _slash = require("slash");

var _slash2 = _interopRequireDefault(_slash);

var _lodashLangClone = require("lodash/lang/clone");

var _lodashLangClone2 = _interopRequireDefault(_lodashLangClone);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _apiNode = require("../../api/node");

var api = _interopRequireWildcard(_apiNode);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var File = (function () {
  function File(_x, pipeline) {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, File);

    this.transformerDependencies = {};

    this.dynamicImportTypes = {};
    this.dynamicImportIds = {};
    this.dynamicImports = [];

    this.declarations = {};
    this.usedHelpers = {};
    this.dynamicData = {};
    this.data = {};

    this.pipeline = pipeline;
    this.log = new _logger2["default"](this, opts.filename || "unknown");
    this.opts = this.normalizeOptions(opts);
    this.ast = {};

    this.buildTransformers();
  }

  File.prototype.normalizeOptions = function normalizeOptions(opts) {
    opts = (0, _lodashObjectAssign2["default"])({}, opts);

    if (opts.filename) {
      var rcFilename = opts.filename;
      if (!(0, _pathIsAbsolute2["default"])(rcFilename)) rcFilename = _path2["default"].join(process.cwd(), rcFilename);
      opts = (0, _toolsResolveRc2["default"])(rcFilename, opts);
    }

    //

    for (var key in opts) {
      if (key[0] === "_") continue;

      var option = File.options[key];
      if (!option) this.log.error("Unknown option: " + key, ReferenceError);
    }

    for (var key in File.options) {
      var option = File.options[key];

      var val = opts[key];
      if (!val && option.optional) continue;

      if (val && option.deprecated) {
        throw new Error("Deprecated option " + key + ": " + option.deprecated);
      }

      if (val == null) {
        val = (0, _lodashLangClone2["default"])(option["default"]);
      }

      var optionParser = optionParsers[option.type];
      if (optionParser) val = optionParser(key, val, this.pipeline);

      if (option.alias) {
        opts[option.alias] = opts[option.alias] || val;
      } else {
        opts[key] = val;
      }
    }

    if (opts.inputSourceMap) {
      opts.sourceMaps = true;
    }

    // normalize windows path separators to unix
    opts.filename = (0, _slash2["default"])(opts.filename);
    if (opts.sourceRoot) {
      opts.sourceRoot = (0, _slash2["default"])(opts.sourceRoot);
    }

    if (opts.moduleId) {
      opts.moduleIds = true;
    }

    opts.basename = _path2["default"].basename(opts.filename, _path2["default"].extname(opts.filename));

    opts.ignore = util.arrayify(opts.ignore, util.regexify);
    opts.only = util.arrayify(opts.only, util.regexify);

    (0, _lodashObjectDefaults2["default"])(opts, {
      moduleRoot: opts.sourceRoot
    });

    (0, _lodashObjectDefaults2["default"])(opts, {
      sourceRoot: opts.moduleRoot
    });

    (0, _lodashObjectDefaults2["default"])(opts, {
      filenameRelative: opts.filename
    });

    (0, _lodashObjectDefaults2["default"])(opts, {
      sourceFileName: opts.filenameRelative,
      sourceMapName: opts.filenameRelative
    });

    //

    if (opts.externalHelpers) {
      this.set("helpersNamespace", t.identifier("babelHelpers"));
    }

    return opts;
  };

  File.prototype.isLoose = function isLoose(key) {
    return (0, _lodashCollectionIncludes2["default"])(this.opts.loose, key);
  };

  File.prototype.buildTransformers = function buildTransformers() {
    var file = this;

    var transformers = this.transformers = {};

    var secondaryStack = [];
    var stack = [];

    // build internal transformers
    for (var key in this.pipeline.transformers) {
      var transformer = this.pipeline.transformers[key];
      var pass = transformers[key] = transformer.buildPass(file);

      if (pass.canTransform()) {
        stack.push(pass);

        if (transformer.metadata.secondPass) {
          secondaryStack.push(pass);
        }

        if (transformer.manipulateOptions) {
          transformer.manipulateOptions(file.opts, file);
        }
      }
    }

    // init plugins!
    var beforePlugins = [];
    var afterPlugins = [];
    var pluginManager = new _pluginManager2["default"]({
      file: this,
      transformers: this.transformers,
      before: beforePlugins,
      after: afterPlugins
    });
    for (var i = 0; i < file.opts.plugins.length; i++) {
      pluginManager.add(file.opts.plugins[i]);
    }
    stack = beforePlugins.concat(stack, afterPlugins);

    // build transformer stack
    this.uncollapsedTransformerStack = stack = stack.concat(secondaryStack);

    // build dependency graph
    var _arr = stack;
    for (var _i = 0; _i < _arr.length; _i++) {
      var pass = _arr[_i];var _arr2 = pass.transformer.dependencies;

      for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
        var dep = _arr2[_i2];
        this.transformerDependencies[dep] = pass.key;
      }
    }

    // collapse stack categories
    this.transformerStack = this.collapseStack(stack);
  };

  File.prototype.collapseStack = function collapseStack(_stack) {
    var stack = [];
    var ignore = [];

    var _arr3 = _stack;
    for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
      var pass = _arr3[_i3];
      // been merged
      if (ignore.indexOf(pass) >= 0) continue;

      var group = pass.transformer.metadata.group;

      // can't merge
      if (!pass.canTransform() || !group) {
        stack.push(pass);
        continue;
      }

      var mergeStack = [];
      var _arr4 = _stack;
      for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
        var _pass = _arr4[_i4];
        if (_pass.transformer.metadata.group === group) {
          mergeStack.push(_pass);
          ignore.push(_pass);
        }
      }

      var visitors = [];
      var _arr5 = mergeStack;
      for (var _i5 = 0; _i5 < _arr5.length; _i5++) {
        var _pass2 = _arr5[_i5];
        visitors.push(_pass2.handlers);
      }
      var visitor = _traversal2["default"].visitors.merge(visitors);
      var mergeTransformer = new _transformer2["default"](group, visitor);
      //console.log(mergeTransformer);
      stack.push(mergeTransformer.buildPass(this));
    }

    return stack;
  };

  File.prototype.set = function set(key, val) {
    return this.data[key] = val;
  };

  File.prototype.setDynamic = function setDynamic(key, fn) {
    this.dynamicData[key] = fn;
  };

  File.prototype.get = function get(key) {
    var data = this.data[key];
    if (data) {
      return data;
    } else {
      var dynamic = this.dynamicData[key];
      if (dynamic) {
        return this.set(key, dynamic());
      }
    }
  };

  File.prototype.resolveModuleSource = function resolveModuleSource(source) {
    var resolveModuleSource = this.opts.resolveModuleSource;
    if (resolveModuleSource) source = resolveModuleSource(source, this.opts.filename);
    return source;
  };

  File.prototype.addImport = function addImport(source, name, type) {
    name = name || source;
    var id = this.dynamicImportIds[name];

    if (!id) {
      source = this.resolveModuleSource(source);
      id = this.dynamicImportIds[name] = this.scope.generateUidIdentifier(name);

      var specifiers = [t.importDefaultSpecifier(id)];
      var declar = t.importDeclaration(specifiers, t.literal(source));
      declar._blockHoist = 3;

      if (type) {
        var modules = this.dynamicImportTypes[type] = this.dynamicImportTypes[type] || [];
        modules.push(declar);
      }

      if (this.transformers["es6.modules"].canTransform()) {
        this.moduleFormatter.importSpecifier(specifiers[0], declar, this.dynamicImports);
        this.moduleFormatter.hasLocalImports = true;
      } else {
        this.dynamicImports.push(declar);
      }
    }

    return id;
  };

  File.prototype.attachAuxiliaryComment = function attachAuxiliaryComment(node) {
    var comment = this.opts.auxiliaryComment;
    if (comment) {
      node.leadingComments = node.leadingComments || [];
      node.leadingComments.push({
        type: "Line",
        value: " " + comment
      });
    }
    return node;
  };

  File.prototype.addHelper = function addHelper(name) {
    var isSolo = (0, _lodashCollectionIncludes2["default"])(File.soloHelpers, name);

    if (!isSolo && !(0, _lodashCollectionIncludes2["default"])(File.helpers, name)) {
      throw new ReferenceError("Unknown helper " + name);
    }

    var program = this.ast.program;

    var declar = this.declarations[name];
    if (declar) return declar;

    this.usedHelpers[name] = true;

    if (!isSolo) {
      var generator = this.get("helperGenerator");
      var runtime = this.get("helpersNamespace");
      if (generator) {
        return generator(name);
      } else if (runtime) {
        var id = t.identifier(t.toIdentifier(name));
        return t.memberExpression(runtime, id);
      }
    }

    var ref = util.template("helper-" + name);

    var uid = this.declarations[name] = this.scope.generateUidIdentifier(name);

    if (t.isFunctionExpression(ref) && !ref.id) {
      ref.body._compact = true;
      ref._generated = true;
      ref.id = uid;
      ref.type = "FunctionDeclaration";
      this.attachAuxiliaryComment(ref);
      this.path.unshiftContainer("body", ref);
    } else {
      ref._compact = true;
      this.scope.push({
        id: uid,
        init: ref,
        unique: true
      });
    }

    return uid;
  };

  File.prototype.errorWithNode = function errorWithNode(node, msg) {
    var Error = arguments[2] === undefined ? SyntaxError : arguments[2];

    var loc = node.loc.start;
    var err = new Error("Line " + loc.line + ": " + msg);
    err.loc = loc;
    return err;
  };

  File.prototype.mergeSourceMap = function mergeSourceMap(map) {
    var opts = this.opts;

    var inputMap = opts.inputSourceMap;

    if (inputMap) {
      map.sources[0] = inputMap.file;

      var inputMapConsumer = new _sourceMap2["default"].SourceMapConsumer(inputMap);
      var outputMapConsumer = new _sourceMap2["default"].SourceMapConsumer(map);
      var outputMapGenerator = _sourceMap2["default"].SourceMapGenerator.fromSourceMap(outputMapConsumer);
      outputMapGenerator.applySourceMap(inputMapConsumer);

      var mergedMap = outputMapGenerator.toJSON();
      mergedMap.sources = inputMap.sources;
      mergedMap.file = inputMap.file;
      return mergedMap;
    }

    return map;
  };

  File.prototype.getModuleFormatter = function getModuleFormatter(type) {
    var ModuleFormatter = (0, _lodashLangIsFunction2["default"])(type) ? type : _modules2["default"][type];

    if (!ModuleFormatter) {
      var loc = util.resolveRelative(type);
      if (loc) ModuleFormatter = require(loc);
    }

    if (!ModuleFormatter) {
      throw new ReferenceError("Unknown module formatter type " + JSON.stringify(type));
    }

    return new ModuleFormatter(this);
  };

  File.prototype.parse = function parse(code) {
    var opts = this.opts;

    //

    var parseOpts = {
      highlightCode: opts.highlightCode,
      nonStandard: opts.nonStandard,
      filename: opts.filename,
      plugins: {}
    };

    var features = parseOpts.features = {};
    for (var key in this.transformers) {
      var transformer = this.transformers[key];
      features[key] = transformer.canTransform();
    }

    parseOpts.looseModules = this.isLoose("es6.modules");
    parseOpts.strictMode = features.strict;
    parseOpts.sourceType = "module";

    this.log.debug("Parse start");
    var tree = (0, _helpersParse2["default"])(code, parseOpts);
    this.log.debug("Parse stop");
    return tree;
  };

  File.prototype._addAst = function _addAst(ast) {
    this.path = _traversalPath2["default"].get(null, null, ast, ast, "program", this);
    this.scope = this.path.scope;
    this.ast = ast;
  };

  File.prototype.addAst = function addAst(ast) {
    this.log.debug("Start set AST");
    this._addAst(ast);
    this.log.debug("End set AST");

    this.log.debug("Start module formatter init");
    var modFormatter = this.moduleFormatter = this.getModuleFormatter(this.opts.modules);
    if (modFormatter.init && this.transformers["es6.modules"].canTransform()) {
      modFormatter.init();
    }
    this.log.debug("End module formatter init");

    this.call("pre");
    var _arr6 = this.transformerStack;
    for (var _i6 = 0; _i6 < _arr6.length; _i6++) {
      var pass = _arr6[_i6];
      pass.transform();
    }
    this.call("post");
  };

  File.prototype.wrap = function wrap(code, callback) {
    code = code + "";

    try {
      if (this.shouldIgnore()) {
        return {
          metadata: {},
          code: code,
          map: null,
          ast: null
        };
      }

      callback();

      return this.generate();
    } catch (err) {
      if (err._babel) {
        throw err;
      } else {
        err._babel = true;
      }

      var message = err.message = "" + this.opts.filename + ": " + err.message;

      var loc = err.loc;
      if (loc) {
        err.codeFrame = (0, _helpersCodeFrame2["default"])(code, loc.line, loc.column + 1, this.opts);
        message += "\n" + err.codeFrame;
      }

      if (err.stack) {
        var newStack = err.stack.replace(err.message, message);
        try {
          err.stack = newStack;
        } catch (e) {}
      }

      throw err;
    }
  };

  File.prototype.addCode = function addCode(code, parseCode) {
    code = (code || "") + "";
    code = this.parseInputSourceMap(code);
    this.code = code;

    if (parseCode) {
      this.parseShebang();
      this.addAst(this.parse(this.code));
    }
  };

  File.prototype.shouldIgnore = function shouldIgnore() {
    var opts = this.opts;
    return util.shouldIgnore(opts.filename, opts.ignore, opts.only);
  };

  File.prototype.call = function call(key) {
    var _arr7 = this.uncollapsedTransformerStack;

    for (var _i7 = 0; _i7 < _arr7.length; _i7++) {
      var pass = _arr7[_i7];
      var fn = pass.transformer[key];
      if (fn) fn(this);
    }
  };

  File.prototype.parseInputSourceMap = function parseInputSourceMap(code) {
    var opts = this.opts;

    if (opts.inputSourceMap !== false) {
      var inputMap = _convertSourceMap2["default"].fromSource(code);
      if (inputMap) {
        opts.inputSourceMap = inputMap.toObject();
        code = _convertSourceMap2["default"].removeComments(code);
      }
    }

    return code;
  };

  File.prototype.parseShebang = function parseShebang() {
    var shebangMatch = _shebangRegex2["default"].exec(this.code);
    if (shebangMatch) {
      this.shebang = shebangMatch[0];
      this.code = this.code.replace(_shebangRegex2["default"], "");
    }
  };

  File.prototype.generate = function generate() {
    var opts = this.opts;
    var ast = this.ast;

    var result = {
      metadata: {},
      code: "",
      map: null,
      ast: null
    };

    if (this.opts.metadataUsedHelpers) {
      result.metadata.usedHelpers = Object.keys(this.usedHelpers);
    }

    if (opts.ast) result.ast = ast;
    if (!opts.code) return result;

    this.log.debug("Generation start");

    var _result = (0, _generation2["default"])(ast, opts, this.code);
    result.code = _result.code;
    result.map = _result.map;

    this.log.debug("Generation end");

    if (this.shebang) {
      // add back shebang
      result.code = "" + this.shebang + "\n" + result.code;
    }

    if (result.map) {
      result.map = this.mergeSourceMap(result.map);
    }

    if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
      result.code += "\n" + _convertSourceMap2["default"].fromObject(result.map).toComment();
    }

    if (opts.sourceMaps === "inline") {
      result.map = null;
    }

    return result;
  };

  _createClass(File, null, [{
    key: "helpers",
    value: ["inherits", "defaults", "create-class", "create-decorated-class", "create-decorated-object", "define-decorated-property-descriptor", "tagged-template-literal", "tagged-template-literal-loose", "to-array", "to-consumable-array", "sliced-to-array", "sliced-to-array-loose", "object-without-properties", "has-own", "slice", "bind", "define-property", "async-to-generator", "interop-require-wildcard", "interop-require-default", "typeof", "extends", "get", "set", "class-call-check", "object-destructuring-empty", "temporal-undefined", "temporal-assert-defined", "self-global", "default-props", "instanceof",

    // legacy
    "interop-require"],
    enumerable: true
  }, {
    key: "soloHelpers",
    value: [],
    enumerable: true
  }, {
    key: "options",
    value: require("./options"),
    enumerable: true
  }]);

  return File;
})();

exports["default"] = File;
module.exports = exports["default"];

// `err.stack` may be a readonly property in some environments
}).call(this,require('_process'))
},{"../../api/node":20,"../../generation":35,"../../helpers/code-frame":42,"../../helpers/parse":45,"../../tools/resolve-rc":50,"../../traversal":156,"../../traversal/path":160,"../../traversal/scope":162,"../../types":167,"../../util":171,"../modules":78,"../transformer":84,"./../index":70,"./logger":52,"./option-parsers":53,"./options":54,"./plugin-manager":55,"_process":198,"convert-source-map":223,"lodash/collection/includes":330,"lodash/lang/clone":400,"lodash/lang/isFunction":406,"lodash/object/assign":415,"lodash/object/defaults":416,"path":197,"path-is-absolute":431,"shebang-regex":478,"slash":479,"source-map":480}],52:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _debugNode = require("debug/node");

var _debugNode2 = _interopRequireDefault(_debugNode);

var verboseDebug = (0, _debugNode2["default"])("babel:verbose");
var generalDebug = (0, _debugNode2["default"])("babel");

var Logger = (function () {
  function Logger(file, filename) {
    _classCallCheck(this, Logger);

    this.filename = filename;
    this.file = file;
  }

  Logger.prototype._buildMessage = function _buildMessage(msg) {
    var parts = "[BABEL] " + this.filename;
    if (msg) parts += ": " + msg;
    return parts;
  };

  Logger.prototype.error = function error(msg) {
    var Constructor = arguments[1] === undefined ? Error : arguments[1];

    throw new Constructor(this._buildMessage(msg));
  };

  Logger.prototype.deprecate = function deprecate(msg) {
    if (!this.file.opts.suppressDeprecationMessages) {
      console.error(this._buildMessage(msg));
    }
  };

  Logger.prototype.verbose = function verbose(msg) {
    if (verboseDebug.enabled) verboseDebug(this._buildMessage(msg));
  };

  Logger.prototype.debug = function debug(msg) {
    if (generalDebug.enabled) generalDebug(this._buildMessage(msg));
  };

  Logger.prototype.deopt = function deopt(node, msg) {
    this.debug(msg);
  };

  return Logger;
})();

exports["default"] = Logger;
module.exports = exports["default"];
},{"debug/node":302}],53:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.transformerList = transformerList;
exports.number = number;
exports.boolean = boolean;
exports.booleanString = booleanString;
exports.list = list;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

function transformerList(key, val, pipeline) {
  val = util.arrayify(val);

  if (val.indexOf("all") >= 0 || val.indexOf(true) >= 0) {
    val = Object.keys(pipeline.transformers);
  }

  return pipeline._ensureTransformerNames(key, val);
}

function number(key, val) {
  return +val;
}

function boolean(key, val) {
  return !!val;
}

function booleanString(key, val) {
  return util.booleanify(val);
}

function list(key, val) {
  return util.list(val);
}
},{"../../util":171}],54:[function(require,module,exports){
module.exports={
  "filename": {
    "type": "string",
    "description": "filename to use when reading from stdin - this will be used in source-maps, errors etc",
    "default": "unknown",
    "shorthand": "f"
  },

  "filenameRelative": {
    "hidden": true,
    "type": "string"
  },

  "inputSourceMap": {
    "hidden": true
  },

  "extra": {
    "hidden": true,
    "default": {}
  },

  "moduleId": {
    "description": "specify a custom name for module ids",
    "type": "string"
  },

  "getModuleId": {
    "hidden": true
  },

  "retainLines": {
    "type": "boolean",
    "default": false,
    "description": "retain line numbers - will result in really ugly code"
  },

  "nonStandard": {
    "type": "boolean",
    "default": true,
    "description": "enable support for JSX and Flow"
  },

  "experimental": {
    "deprecated": "use `--stage 0`/`{ stage: 0 }` instead"
  },

  "highlightCode": {
    "description": "ANSI syntax highlight code frames",
    "type": "boolean",
    "default": true
  },

  "suppressDeprecationMessages": {
    "type": "boolean",
    "default": false,
    "hidden": true
  },

  "resolveModuleSource": {
    "hidden": true
  },

  "stage": {
    "description": "ECMAScript proposal stage version to allow [0-4]",
    "shorthand": "e",
    "type": "number",
    "default": 2
  },

  "blacklist": {
    "type": "transformerList",
    "description": "blacklist of transformers to NOT use",
    "shorthand": "b"
  },

  "whitelist": {
    "type": "transformerList",
    "optional": true,
    "description": "whitelist of transformers to ONLY use",
    "shorthand": "l"
  },

  "optional": {
    "type": "transformerList",
    "description": "list of optional transformers to enable"
  },

  "modules": {
    "type": "string",
    "description": "module formatter type to use [common]",
    "default": "common",
    "shorthand": "m"
  },

  "moduleIds": {
    "type": "boolean",
    "default": false,
    "shorthand": "M",
    "description": "insert an explicit id for modules"
  },

  "loose": {
    "type": "transformerList",
    "description": "list of transformers to enable loose mode ON",
    "shorthand": "L"
  },

  "jsxPragma": {
    "type": "string",
    "description": "custom pragma to use with JSX (same functionality as @jsx comments)",
    "default": "React.createElement",
    "shorthand": "P"
  },

  "plugins": {
    "type": "list",
    "description": ""
  },

  "ignore": {
    "type": "list",
    "description": "list of glob paths to **not** compile"
  },

  "only": {
    "type": "list",
    "description": "list of glob paths to **only** compile"
  },

  "code": {
    "hidden": true,
    "default": true,
    "type": "boolean"
  },

  "ast": {
    "hidden": true,
    "default": true,
    "type": "boolean"
  },

  "comments": {
    "type": "boolean",
    "default": true,
    "description": "output comments in generated output"
  },

  "compact": {
    "type": "booleanString",
    "default": "auto",
    "description": "do not include superfluous whitespace characters and line terminators [true|false|auto]"
  },

  "keepModuleIdExtensions": {
    "type": "boolean",
    "description": "keep extensions when generating module ids",
    "default": false,
    "shorthand": "k"
  },

  "auxiliaryComment": {
    "type": "string",
    "default": "",
    "shorthand": "a",
    "description": "attach a comment before all helper declarations and auxiliary code"
  },

  "externalHelpers": {
    "type": "boolean",
    "default": false,
    "shorthand": "r",
    "description": "uses a reference to `babelHelpers` instead of placing helpers at the top of your code."
  },

  "metadataUsedHelpers": {
    "type": "boolean",
    "default": false,
    "hidden": true
  },

  "sourceMap": {
    "alias": "sourceMaps",
    "hidden": true
  },

  "sourceMaps": {
    "type": "booleanString",
    "description": "[true|false|inline]",
    "default": false,
    "shorthand": "s"
  },

  "sourceMapName": {
    "type": "string",
    "description": "set `file` on returned source map"
  },

  "sourceFileName": {
    "type": "string",
    "description": "set `sources[0]` on returned source map"
  },

  "sourceRoot": {
    "type": "string",
    "description": "the root from which all sources are relative"
  },

  "moduleRoot": {
    "type": "string",
    "description": "optional prefix for the AMD module formatter that will be prepend to the filename on module definitions"
  },

  "breakConfig": {
    "type": "boolean",
    "default": false,
    "hidden": true,
    "description": "stop trying to load .babelrc files"
  },

  "babelrc": {
    "hidden": true,
    "description": "do not load the same .babelrc file twice"
  }
}

},{}],55:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _apiNode = require("../../api/node");

var node = _interopRequireWildcard(_apiNode);

var _messages = require("../../messages");

var messages = _interopRequireWildcard(_messages);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var PluginManager = (function () {
  function PluginManager() {
    var _ref = arguments[0] === undefined ? { transformers: {}, before: [], after: [] } : arguments[0];

    var file = _ref.file;
    var transformers = _ref.transformers;
    var before = _ref.before;
    var after = _ref.after;

    _classCallCheck(this, PluginManager);

    this.transformers = transformers;
    this.file = file;
    this.before = before;
    this.after = after;
  }

  PluginManager.memoisePluginContainer = function memoisePluginContainer(fn) {
    for (var i = 0; i < PluginManager.memoisedPlugins.length; i++) {
      var plugin = PluginManager.memoisedPlugins[i];
      if (plugin.container === fn) return plugin.transformer;
    }

    var transformer = fn(node);
    PluginManager.memoisedPlugins.push({
      container: fn,
      transformer: transformer
    });
    return transformer;
  };

  PluginManager.prototype.subnormaliseString = function subnormaliseString(name, position) {
    // this is a plugin in the form of "foobar" or "foobar:after"
    // where the optional colon is the delimiter for plugin position in the transformer stack

    var match = name.match(/^(.*?):(after|before)$/);
    if (match) {
      ;

      var _temp = match;
      name = _temp[1];
      position = _temp[2];
      _temp;
    }var loc = util.resolveRelative(name) || util.resolveRelative("babel-plugin-" + name);
    if (loc) {
      return {
        position: position,
        plugin: require(loc)
      };
    } else {
      throw new ReferenceError(messages.get("pluginUnknown", name));
    }
  };

  PluginManager.prototype.validate = function validate(name, plugin) {
    // validate transformer key
    var key = plugin.key;
    if (this.transformers[key]) {
      throw new ReferenceError(messages.get("pluginKeyCollision", key));
    }

    // validate Transformer instance
    if (!plugin.buildPass || plugin.constructor.name !== "Transformer") {
      throw new TypeError(messages.get("pluginNotTransformer", name));
    }

    // register as a plugin
    plugin.metadata.plugin = true;
  };

  PluginManager.prototype.add = function add(name) {
    var position;
    var plugin;

    if (name) {
      if (typeof name === "object" && name.transformer) {
        var _temp2 = name;
        plugin = _temp2.transformer;
        position = _temp2.position;
        _temp2;
      } else if (typeof name !== "string") {
        // not a string so we'll just assume that it's a direct Transformer instance, if not then
        // the checks later on will complain
        plugin = name;
      }

      if (typeof name === "string") {
        var _temp3 = this.subnormaliseString(name, position);

        plugin = _temp3.plugin;
        position = _temp3.position;
        _temp3;
      }
    } else {
      throw new TypeError(messages.get("pluginIllegalKind", typeof name, name));
    }

    // default position
    position = position || "before";

    // validate position
    if (PluginManager.positions.indexOf(position) < 0) {
      throw new TypeError(messages.get("pluginIllegalPosition", position, name));
    }

    // allow plugin containers to be specified so they don't have to manually require
    if (typeof plugin === "function") {
      plugin = PluginManager.memoisePluginContainer(plugin);
    }

    //
    this.validate(name, plugin);

    // build!
    var pass = this.transformers[plugin.key] = plugin.buildPass(this.file);
    if (pass.canTransform()) {
      var stack = position === "before" ? this.before : this.after;
      stack.push(pass);
    }
  };

  _createClass(PluginManager, null, [{
    key: "memoisedPlugins",
    value: [],
    enumerable: true
  }, {
    key: "positions",
    value: ["before", "after"],
    enumerable: true
  }]);

  return PluginManager;
})();

exports["default"] = PluginManager;
module.exports = exports["default"];
},{"../../api/node":20,"../../messages":46,"../../util":171}],56:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _explodeAssignableExpression = require("./explode-assignable-expression");

var _explodeAssignableExpression2 = _interopRequireDefault(_explodeAssignableExpression);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

exports["default"] = function (opts) {
  var exports = {};

  var isAssignment = function isAssignment(node) {
    return node.operator === opts.operator + "=";
  };

  var buildAssignment = function buildAssignment(left, right) {
    return t.assignmentExpression("=", left, right);
  };

  exports.ExpressionStatement = function (node, parent, scope, file) {
    // hit the `AssignmentExpression` one below
    if (this.isCompletionRecord()) return;

    var expr = node.expression;
    if (!isAssignment(expr)) return;

    var nodes = [];
    var exploded = (0, _explodeAssignableExpression2["default"])(expr.left, nodes, file, scope, true);

    nodes.push(t.expressionStatement(buildAssignment(exploded.ref, opts.build(exploded.uid, expr.right))));

    return nodes;
  };

  exports.AssignmentExpression = function (node, parent, scope, file) {
    if (!isAssignment(node)) return;

    var nodes = [];
    var exploded = (0, _explodeAssignableExpression2["default"])(node.left, nodes, file, scope);
    nodes.push(buildAssignment(exploded.ref, opts.build(exploded.uid, node.right)));
    return nodes;
  };

  exports.BinaryExpression = function (node) {
    if (node.operator !== opts.operator) return;
    return opts.build(node.left, node.right);
  };

  return exports;
};

;
module.exports = exports["default"];
},{"../../types":167,"./explode-assignable-expression":61}],57:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = build;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function build(node, buildBody) {
  var self = node.blocks.shift();
  if (!self) return;

  var child = build(node, buildBody);
  if (!child) {
    // last item
    child = buildBody();

    // add a filter as this is our final stop
    if (node.filter) {
      child = t.ifStatement(node.filter, t.blockStatement([child]));
    }
  }

  return t.forOfStatement(t.variableDeclaration("let", [t.variableDeclarator(self.left)]), self.right, t.blockStatement([child]));
}

module.exports = exports["default"];
},{"../../types":167}],58:[function(require,module,exports){
// Based upon the excellent jsx-transpiler by Ingvar Stepanyan (RReverser)
// https://github.com/RReverser/jsx-transpiler

// jsx

"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsString = require("lodash/lang/isString");

var _lodashLangIsString2 = _interopRequireDefault(_lodashLangIsString);

var _messages = require("../../messages");

var messages = _interopRequireWildcard(_messages);

var _esutils = require("esutils");

var _esutils2 = _interopRequireDefault(_esutils);

var _react = require("./react");

var react = _interopRequireWildcard(_react);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

exports["default"] = function (exports, opts) {
  exports.JSXIdentifier = function (node, parent) {
    if (node.name === "this" && this.isReferenced()) {
      return t.thisExpression();
    } else if (_esutils2["default"].keyword.isIdentifierNameES6(node.name)) {
      node.type = "Identifier";
    } else {
      return t.literal(node.name);
    }
  };

  exports.JSXNamespacedName = function (node, parent, scope, file) {
    throw this.errorWithNode(messages.get("JSXNamespacedTags"));
  };

  exports.JSXMemberExpression = {
    exit: function exit(node) {
      node.computed = t.isLiteral(node.property);
      node.type = "MemberExpression";
    }
  };

  exports.JSXExpressionContainer = function (node) {
    return node.expression;
  };

  exports.JSXAttribute = {
    enter: function enter(node) {
      var value = node.value;
      if (t.isLiteral(value) && (0, _lodashLangIsString2["default"])(value.value)) {
        value.value = value.value.replace(/\n\s+/g, " ");
      }
    },

    exit: function exit(node) {
      var value = node.value || t.literal(true);
      return t.inherits(t.property("init", node.name, value), node);
    }
  };

  exports.JSXOpeningElement = {
    exit: function exit(node, parent, scope, file) {
      parent.children = react.buildChildren(parent);

      var tagExpr = node.name;
      var args = [];

      var tagName;
      if (t.isIdentifier(tagExpr)) {
        tagName = tagExpr.name;
      } else if (t.isLiteral(tagExpr)) {
        tagName = tagExpr.value;
      }

      var state = {
        tagExpr: tagExpr,
        tagName: tagName,
        args: args
      };

      if (opts.pre) {
        opts.pre(state, file);
      }

      var attribs = node.attributes;
      if (attribs.length) {
        attribs = buildJSXOpeningElementAttributes(attribs, file);
      } else {
        attribs = t.literal(null);
      }

      args.push(attribs);

      if (opts.post) {
        opts.post(state, file);
      }

      return state.call || t.callExpression(state.callee, args);
    }
  };

  /**
   * The logic for this is quite terse. It's because we need to
   * support spread elements. We loop over all attributes,
   * breaking on spreads, we then push a new object containg
   * all prior attributes to an array for later processing.
   */

  var buildJSXOpeningElementAttributes = function buildJSXOpeningElementAttributes(attribs, file) {
    var _props = [];
    var objs = [];

    var pushProps = function pushProps() {
      if (!_props.length) return;

      objs.push(t.objectExpression(_props));
      _props = [];
    };

    while (attribs.length) {
      var prop = attribs.shift();
      if (t.isJSXSpreadAttribute(prop)) {
        pushProps();
        objs.push(prop.argument);
      } else {
        _props.push(prop);
      }
    }

    pushProps();

    if (objs.length === 1) {
      // only one object
      attribs = objs[0];
    } else {
      // looks like we have multiple objects
      if (!t.isObjectExpression(objs[0])) {
        objs.unshift(t.objectExpression([]));
      }

      // spread it
      attribs = t.callExpression(file.addHelper("extends"), objs);
    }

    return attribs;
  };

  exports.JSXElement = {
    exit: function exit(node) {
      var callExpr = node.openingElement;

      callExpr.arguments = callExpr.arguments.concat(node.children);

      if (callExpr.arguments.length >= 3) {
        callExpr._prettyCall = true;
      }

      return t.inherits(callExpr, node);
    }
  };

  // display names

  var addDisplayName = function addDisplayName(id, call) {
    var props = call.arguments[0].properties;
    var safe = true;

    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (t.isIdentifier(prop.key, { name: "displayName" })) {
        safe = false;
        break;
      }
    }

    if (safe) {
      props.unshift(t.property("init", t.identifier("displayName"), t.literal(id)));
    }
  };

  exports.ExportDefaultDeclaration = function (node, parent, scope, file) {
    if (react.isCreateClass(node.declaration)) {
      addDisplayName(file.opts.basename, node.declaration);
    }
  };

  exports.AssignmentExpression = exports.Property = exports.VariableDeclarator = function (node) {
    var left, right;

    if (t.isAssignmentExpression(node)) {
      left = node.left;
      right = node.right;
    } else if (t.isProperty(node)) {
      left = node.key;
      right = node.value;
    } else if (t.isVariableDeclarator(node)) {
      left = node.id;
      right = node.init;
    }

    if (t.isMemberExpression(left)) {
      left = left.property;
    }

    if (t.isIdentifier(left) && react.isCreateClass(right)) {
      addDisplayName(left.name, right);
    }
  };
};

;
module.exports = exports["default"];
},{"../../messages":46,"../../types":167,"./react":65,"esutils":312,"lodash/lang/isString":412}],59:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _traversal = require("../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var visitor = {
  enter: function enter(node, parent, scope, state) {
    if (this.isThisExpression() || this.isReferencedIdentifier({ name: "arguments" })) {
      state.found = true;
      this.stop();
    }

    if (this.isFunction()) {
      this.skip();
    }
  }
};

exports["default"] = function (node, scope) {
  var container = t.functionExpression(null, [], node.body, node.generator, node.async);

  var callee = container;
  var args = [];

  var state = { found: false };
  scope.traverse(node, visitor, state);
  if (state.found) {
    callee = t.memberExpression(container, t.identifier("apply"));
    args = [t.thisExpression(), t.identifier("arguments")];
  }

  var call = t.callExpression(callee, args);
  if (node.generator) call = t.yieldExpression(call, true);

  return t.returnStatement(call);
};

module.exports = exports["default"];
},{"../../traversal":156,"../../types":167}],60:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.push = push;
exports.hasComputed = hasComputed;
exports.toComputedObjectFromClass = toComputedObjectFromClass;
exports.toClassObject = toClassObject;
exports.toDefineObject = toDefineObject;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangCloneDeep = require("lodash/lang/cloneDeep");

var _lodashLangCloneDeep2 = _interopRequireDefault(_lodashLangCloneDeep);

var _traversal = require("../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashObjectHas = require("lodash/object/has");

var _lodashObjectHas2 = _interopRequireDefault(_lodashObjectHas);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function push(mutatorMap, node, kind, file) {
  var alias = t.toKeyAlias(node);

  //

  var map = {};
  if ((0, _lodashObjectHas2["default"])(mutatorMap, alias)) map = mutatorMap[alias];
  mutatorMap[alias] = map;

  //

  map._inherits = map._inherits || [];
  map._inherits.push(node);

  map._key = node.key;

  if (node.computed) {
    map._computed = true;
  }

  if (node.decorators) {
    var decorators = map.decorators = map.decorators || t.arrayExpression([]);
    decorators.elements = decorators.elements.concat(node.decorators.map(function (dec) {
      return dec.expression;
    }).reverse());
  }

  if (map.value || map.initializer) {
    throw file.errorWithNode(node, "Key conflict with sibling node");
  }

  if (node.value) {
    if (node.kind === "init") kind = "value";
    if (node.kind === "get") kind = "get";
    if (node.kind === "set") kind = "set";

    t.inheritsComments(node.value, node);
    map[kind] = node.value;
  }

  return map;
}

function hasComputed(mutatorMap) {
  for (var key in mutatorMap) {
    if (mutatorMap[key]._computed) {
      return true;
    }
  }
  return false;
}

function toComputedObjectFromClass(obj) {
  var objExpr = t.arrayExpression([]);

  for (var i = 0; i < obj.properties.length; i++) {
    var prop = obj.properties[i];
    var val = prop.value;
    val.properties.unshift(t.property("init", t.identifier("key"), t.toComputedKey(prop)));
    objExpr.elements.push(val);
  }

  return objExpr;
}

function toClassObject(mutatorMap) {
  var objExpr = t.objectExpression([]);

  (0, _lodashCollectionEach2["default"])(mutatorMap, function (map) {
    var mapNode = t.objectExpression([]);

    var propNode = t.property("init", map._key, mapNode, map._computed);

    (0, _lodashCollectionEach2["default"])(map, function (node, key) {
      if (key[0] === "_") return;

      var inheritNode = node;
      if (t.isMethodDefinition(node) || t.isClassProperty(node)) node = node.value;

      var prop = t.property("init", t.identifier(key), node);
      t.inheritsComments(prop, inheritNode);
      t.removeComments(inheritNode);

      mapNode.properties.push(prop);
    });

    objExpr.properties.push(propNode);
  });

  return objExpr;
}

function toDefineObject(mutatorMap) {
  (0, _lodashCollectionEach2["default"])(mutatorMap, function (map) {
    if (map.value) map.writable = t.literal(true);
    map.configurable = t.literal(true);
    map.enumerable = t.literal(true);
  });

  return toClassObject(mutatorMap);
}
},{"../../traversal":156,"../../types":167,"lodash/collection/each":328,"lodash/lang/cloneDeep":401,"lodash/object/has":418}],61:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var getObjRef = function getObjRef(node, nodes, file, scope) {
  var ref;
  if (t.isIdentifier(node)) {
    if (scope.hasBinding(node.name)) {
      // this variable is declared in scope so we can be 100% sure
      // that evaluating it multiple times wont trigger a getter
      // or something else
      return node;
    } else {
      // could possibly trigger a getter so we need to only evaluate
      // it once
      ref = node;
    }
  } else if (t.isMemberExpression(node)) {
    ref = node.object;

    if (t.isIdentifier(ref) && scope.hasGlobal(ref.name)) {
      // the object reference that we need to save is locally declared
      // so as per the previous comment we can be 100% sure evaluating
      // it multiple times will be safe
      return ref;
    }
  } else {
    throw new Error("We can't explode this node type " + node.type);
  }

  var temp = scope.generateUidBasedOnNode(ref);
  nodes.push(t.variableDeclaration("var", [t.variableDeclarator(temp, ref)]));
  return temp;
};

var getPropRef = function getPropRef(node, nodes, file, scope) {
  var prop = node.property;
  var key = t.toComputedKey(node, prop);
  if (t.isLiteral(key)) return key;

  var temp = scope.generateUidBasedOnNode(prop);
  nodes.push(t.variableDeclaration("var", [t.variableDeclarator(temp, prop)]));
  return temp;
};

exports["default"] = function (node, nodes, file, scope, allowedSingleIdent) {
  var obj;
  if (t.isIdentifier(node) && allowedSingleIdent) {
    obj = node;
  } else {
    obj = getObjRef(node, nodes, file, scope);
  }

  var ref, uid;

  if (t.isIdentifier(node)) {
    ref = node;
    uid = obj;
  } else {
    var prop = getPropRef(node, nodes, file, scope);
    var computed = node.computed || t.isLiteral(prop);
    uid = ref = t.memberExpression(obj, prop, computed);
  }

  return {
    uid: uid,
    ref: ref
  };
};

;
module.exports = exports["default"];
},{"../../types":167}],62:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

exports["default"] = function (node) {
  var lastNonDefault = 0;
  for (var i = 0; i < node.params.length; i++) {
    if (!t.isAssignmentPattern(node.params[i])) lastNonDefault = i + 1;
  }
  return lastNonDefault;
};

;
module.exports = exports["default"];
},{"../../types":167}],63:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

exports["default"] = function (decorators, scope) {
  for (var i = 0; i < decorators.length; i++) {
    var decorator = decorators[i];
    var expression = decorator.expression;
    if (!t.isMemberExpression(expression)) continue;

    var temp = scope.generateMemoisedReference(expression.object);
    var ref;

    var nodes = [];

    if (temp) {
      ref = temp;
      nodes.push(t.assignmentExpression("=", temp, expression.object));
    } else {
      ref = expression.object;
    }

    nodes.push(t.callExpression(t.memberExpression(t.memberExpression(ref, expression.property, expression.computed), t.identifier("bind")), [ref]));

    if (nodes.length === 1) {
      decorator.expression = nodes[0];
    } else {
      decorator.expression = t.sequenceExpression(nodes);
    }
  }

  return decorators;
};

module.exports = exports["default"];
},{"../../types":167}],64:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.custom = custom;
exports.property = property;
exports.bare = bare;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _getFunctionArity = require("./get-function-arity");

var _getFunctionArity2 = _interopRequireDefault(_getFunctionArity);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var visitor = {
  enter: function enter(node, parent, scope, state) {
    // check if this node is a referenced identifier that matches the same as our
    // function id
    if (!this.isReferencedIdentifier({ name: state.name })) return;

    // check that we don't have a local variable declared as that removes the need
    // for the wrapper
    var localDeclar = scope.getBindingIdentifier(state.name);
    if (localDeclar !== state.outerDeclar) return;

    state.selfReference = true;
    this.stop();
  }
};

var wrap = function wrap(state, method, id, scope) {
  if (state.selfReference) {
    if (scope.hasBinding(id.name)) {
      // we can just munge the local binding
      scope.rename(id.name);
    } else {
      // need to add a wrapper since we can't change the references
      var templateName = "property-method-assignment-wrapper";
      if (method.generator) templateName += "-generator";
      var template = util.template(templateName, {
        FUNCTION: method,
        FUNCTION_ID: id,
        FUNCTION_KEY: scope.generateUidIdentifier(id.name)
      });
      template.callee._skipModulesRemap = true;

      // shim in dummy params to retain function arity, if you try to read the
      // source then you'll get the original since it's proxied so it's all good
      var params = template.callee.body.body[0].params;
      for (var i = 0, len = (0, _getFunctionArity2["default"])(method); i < len; i++) {
        params.push(scope.generateUidIdentifier("x"));
      }

      return template;
    }
  }

  method.id = id;
};

var visit = function visit(node, name, scope) {
  var state = {
    selfAssignment: false,
    selfReference: false,
    outerDeclar: scope.getBindingIdentifier(name),
    references: [],
    name: name
  };

  // check to see if we have a local binding of the id we're setting inside of
  // the function, this is important as there are caveats associated

  var bindingInfo = scope.getOwnBindingInfo(name);

  if (bindingInfo) {
    if (bindingInfo.kind === "param") {
      // safari will blow up in strict mode with code like:
      //
      //   var t = function t(t) {};
      //
      // with the error:
      //
      //   Cannot declare a parameter named 't' as it shadows the name of a
      //   strict mode function.
      //
      // this isn't to the spec and they've invented this behaviour which is
      // **extremely** annoying so we avoid setting the name if it has a param
      // with the same id
      state.selfReference = true;
    } else {}
  } else if (state.outerDeclar || scope.hasGlobal(name)) {
    scope.traverse(node, visitor, state);
  }

  return state;
};

function custom(node, id, scope) {
  var state = visit(node, id.name, scope);
  return wrap(state, node, id, scope);
}

function property(node, file, scope) {
  var key = t.toComputedKey(node, node.key);
  if (!t.isLiteral(key)) return; // we can't set a function id with this

  var name = t.toIdentifier(key.value);
  if (name === "eval" || name === "arguments") name = "_" + name;
  var id = t.identifier(name);

  var method = node.value;
  var state = visit(method, name, scope);
  node.value = wrap(state, method, id, scope) || method;
}

function bare(node, parent, scope) {
  // has an `id` so we don't need to infer one
  if (node.id) return;

  var id;
  if (t.isProperty(parent) && parent.kind === "init" && (!parent.computed || t.isLiteral(parent.key))) {
    // { foo() {} };
    id = parent.key;
  } else if (t.isVariableDeclarator(parent)) {
    // var foo = function () {};
    id = parent.id;

    if (t.isIdentifier(id)) {
      var bindingInfo = scope.parent.getBinding(id.name);
      if (bindingInfo && bindingInfo.constant && scope.getBinding(id.name) === bindingInfo) {
        // always going to reference this method
        node.id = id;
        return;
      }
    }
  } else {
    return;
  }

  var name;
  if (t.isLiteral(id)) {
    name = id.value;
  } else if (t.isIdentifier(id)) {
    name = id.name;
  } else {
    return;
  }

  name = t.toIdentifier(name);
  id = t.identifier(name);

  var state = visit(node, name, scope);
  return wrap(state, node, id, scope);
}

// otherwise it's defined somewhere in scope like:
//
//   var t = function () {
//     var t = 2;
//   };
//
// so we can safely just set the id and move along as it shadows the
// bound function id
},{"../../types":167,"../../util":171,"./get-function-arity":62}],65:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.isCreateClass = isCreateClass;
exports.isCompatTag = isCompatTag;
exports.buildChildren = buildChildren;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsString = require("lodash/lang/isString");

var _lodashLangIsString2 = _interopRequireDefault(_lodashLangIsString);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var isCreateClassCallExpression = t.buildMatchMemberExpression("React.createClass");

function isCreateClass(node) {
  if (!node || !t.isCallExpression(node)) return false;

  // not React.createClass call member object
  if (!isCreateClassCallExpression(node.callee)) return false;

  // no call arguments
  var args = node.arguments;
  if (args.length !== 1) return false;

  // first node arg is not an object
  var first = args[0];
  if (!t.isObjectExpression(first)) return false;

  return true;
}

var isReactComponent = t.buildMatchMemberExpression("React.Component");

exports.isReactComponent = isReactComponent;

function isCompatTag(tagName) {
  return tagName && /^[a-z]|\-/.test(tagName);
}

function isStringLiteral(node) {
  return t.isLiteral(node) && (0, _lodashLangIsString2["default"])(node.value);
}

function cleanJSXElementLiteralChild(child, args) {
  var lines = child.value.split(/\r\n|\n|\r/);

  var lastNonEmptyLine = 0;

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }

  var str = "";

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    var isFirstLine = i === 0;
    var isLastLine = i === lines.length - 1;
    var isLastNonEmptyLine = i === lastNonEmptyLine;

    // replace rendered whitespace tabs with spaces
    var trimmedLine = line.replace(/\t/g, " ");

    // trim whitespace touching a newline
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, "");
    }

    // trim whitespace touching an endline
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, "");
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += " ";
      }

      str += trimmedLine;
    }
  }

  if (str) args.push(t.literal(str));
}

function buildChildren(node) {
  var elems = [];

  for (var i = 0; i < node.children.length; i++) {
    var child = node.children[i];

    if (t.isLiteral(child) && typeof child.value === "string") {
      cleanJSXElementLiteralChild(child, elems);
      continue;
    }

    if (t.isJSXExpressionContainer(child)) child = child.expression;
    if (t.isJSXEmptyExpression(child)) continue;

    elems.push(child);
  }

  return elems;
}
},{"../../types":167,"lodash/lang/isString":412}],66:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.is = is;
exports.pullFlag = pullFlag;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashArrayPull = require("lodash/array/pull");

var _lodashArrayPull2 = _interopRequireDefault(_lodashArrayPull);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function is(node, flag) {
  return t.isLiteral(node) && node.regex && node.regex.flags.indexOf(flag) >= 0;
}

function pullFlag(node, flag) {
  var flags = node.regex.flags.split("");
  if (node.regex.flags.indexOf(flag) < 0) return;
  (0, _lodashArrayPull2["default"])(flags, flag);
  node.regex.flags = flags.join("");
}
},{"../../types":167,"lodash/array/pull":325}],67:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var awaitVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (t.isFunction(node)) this.skip();

    if (t.isAwaitExpression(node)) {
      node.type = "YieldExpression";

      if (node.all) {
        // await* foo; -> yield Promise.all(foo);
        node.all = false;
        node.argument = t.callExpression(t.memberExpression(t.identifier("Promise"), t.identifier("all")), [node.argument]);
      }
    }
  }
};

var referenceVisitor = {
  enter: function enter(node, parent, scope, state) {
    var name = state.id.name;
    if (this.isReferencedIdentifier({ name: name }) && scope.bindingIdentifierEquals(name, state.id)) {
      return state.ref = state.ref || scope.generateUidIdentifier(name);
    }
  }
};

exports["default"] = function (node, callId, scope) {
  node.async = false;
  node.generator = true;

  scope.traverse(node, awaitVisitor, state);

  var call = t.callExpression(callId, [node]);

  var id = node.id;
  node.id = null;

  if (t.isFunctionDeclaration(node)) {
    var declar = t.variableDeclaration("let", [t.variableDeclarator(id, call)]);
    declar._blockHoist = true;
    return declar;
  } else {
    if (id) {
      var state = { id: id };
      scope.traverse(node, referenceVisitor, state);

      if (state.ref) {
        scope.parent.push({ id: state.ref });
        return t.assignmentExpression("=", state.ref, call);
      }
    }

    return call;
  }
};

;
module.exports = exports["default"];
},{"../../types":167}],68:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _messages = require("../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function isIllegalBareSuper(node, parent) {
  if (!t.isSuper(node)) return false;
  if (t.isMemberExpression(parent, { computed: false })) return false;
  if (t.isCallExpression(parent, { callee: node })) return false;
  return true;
}

function isMemberExpressionSuper(node) {
  return t.isMemberExpression(node) && t.isSuper(node.object);
}

var visitor = {
  enter: function enter(node, parent, scope, state) {
    var topLevel = state.topLevel;
    var self = state.self;

    if (t.isFunction(node) && !t.isArrowFunctionExpression(node)) {
      // we need to call traverseLevel again so we're context aware
      self.traverseLevel(this, false);
      return this.skip();
    }

    if (t.isProperty(node, { method: true }) || t.isMethodDefinition(node)) {
      // break on object methods
      return this.skip();
    }

    var getThisReference = topLevel ?
    // top level so `this` is the instance
    t.thisExpression :
    // not in the top level so we need to create a reference
    self.getThisReference.bind(self);

    var callback = self.specHandle;
    if (self.isLoose) callback = self.looseHandle;
    var result = callback.call(self, this, getThisReference);
    if (result) this.hasSuper = true;
    if (result === true) return;
    return result;
  }
};

var ReplaceSupers = (function () {

  /**
   * Description
   */

  function ReplaceSupers(opts) {
    var inClass = arguments[1] === undefined ? false : arguments[1];

    _classCallCheck(this, ReplaceSupers);

    this.topLevelThisReference = opts.topLevelThisReference;
    this.methodPath = opts.methodPath;
    this.methodNode = opts.methodNode;
    this.superRef = opts.superRef;
    this.isStatic = opts.isStatic;
    this.hasSuper = false;
    this.inClass = inClass;
    this.isLoose = opts.isLoose;
    this.scope = opts.scope;
    this.file = opts.file;
    this.opts = opts;
  }

  ReplaceSupers.prototype.getObjectRef = function getObjectRef() {
    return this.opts.objectRef || this.opts.getObjectRef();
  };

  /**
   * Sets a super class value of the named property.
   *
   * @example
   *
   *   _set(Object.getPrototypeOf(CLASS.prototype), "METHOD", "VALUE", this)
   *
   */

  ReplaceSupers.prototype.setSuperProperty = function setSuperProperty(property, value, isComputed, thisExpression) {
    return t.callExpression(this.file.addHelper("set"), [t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("getPrototypeOf")), [this.isStatic ? this.getObjectRef() : t.memberExpression(this.getObjectRef(), t.identifier("prototype"))]), isComputed ? property : t.literal(property.name), value, thisExpression]);
  };

  /**
   * Gets a node representing the super class value of the named property.
   *
   * @example
   *
   *   _get(Object.getPrototypeOf(CLASS.prototype), "METHOD", this)
   *
   */

  ReplaceSupers.prototype.getSuperProperty = function getSuperProperty(property, isComputed, thisExpression) {
    return t.callExpression(this.file.addHelper("get"), [t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("getPrototypeOf")), [this.isStatic ? this.getObjectRef() : t.memberExpression(this.getObjectRef(), t.identifier("prototype"))]), isComputed ? property : t.literal(property.name), thisExpression]);
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.replace = function replace() {
    this.traverseLevel(this.methodPath.get("value"), true);
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.traverseLevel = function traverseLevel(path, topLevel) {
    var state = { self: this, topLevel: topLevel };
    path.traverse(visitor, state);
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.getThisReference = function getThisReference() {
    if (this.topLevelThisReference) {
      return this.topLevelThisReference;
    } else {
      var ref = this.topLevelThisReference = this.scope.generateUidIdentifier("this");
      this.methodNode.value.body.body.unshift(t.variableDeclaration("var", [t.variableDeclarator(this.topLevelThisReference, t.thisExpression())]));
      return ref;
    }
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.getLooseSuperProperty = function getLooseSuperProperty(id, parent) {
    var methodNode = this.methodNode;
    var methodName = methodNode.key;
    var superRef = this.superRef || t.identifier("Function");

    if (parent.property === id) {
      return;
    } else if (t.isCallExpression(parent, { callee: id })) {
      // super(); -> objectRef.prototype.MethodName.call(this);
      parent.arguments.unshift(t.thisExpression());

      if (methodName.name === "constructor") {
        // constructor() { super(); }
        return t.memberExpression(superRef, t.identifier("call"));
      } else {
        id = superRef;

        // foo() { super(); }
        if (!methodNode["static"]) {
          id = t.memberExpression(id, t.identifier("prototype"));
        }

        id = t.memberExpression(id, methodName, methodNode.computed);
        return t.memberExpression(id, t.identifier("call"));
      }
    } else if (t.isMemberExpression(parent) && !methodNode["static"]) {
      // super.test -> objectRef.prototype.test
      return t.memberExpression(superRef, t.identifier("prototype"));
    } else {
      return superRef;
    }
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.looseHandle = function looseHandle(path, getThisReference) {
    var node = path.node;
    if (path.isSuper()) {
      return this.getLooseSuperProperty(node, path.parent);
    } else if (path.isCallExpression()) {
      var callee = node.callee;
      if (!t.isMemberExpression(callee)) return;
      if (!t.isSuper(callee.object)) return;

      // super.test(); -> objectRef.prototype.MethodName.call(this);
      t.appendToMemberExpression(callee, t.identifier("call"));
      node.arguments.unshift(getThisReference());
      return true;
    }
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.specHandleAssignmentExpression = function specHandleAssignmentExpression(ref, path, node, getThisReference) {
    if (node.operator === "=") {
      // super.name = "val"; -> _set(Object.getPrototypeOf(objectRef.prototype), "name", this);
      return this.setSuperProperty(node.left.property, node.right, node.left.computed, getThisReference());
    } else {
      // super.age += 2; -> var _ref = super.age; super.age = _ref + 2;
      ref = ref || path.scope.generateUidIdentifier("ref");
      return [t.variableDeclaration("var", [t.variableDeclarator(ref, node.left)]), t.expressionStatement(t.assignmentExpression("=", node.left, t.binaryExpression(node.operator[0], ref, node.right)))];
    }
  };

  /**
   * Description
   */

  ReplaceSupers.prototype.specHandle = function specHandle(path, getThisReference) {
    var methodNode = this.methodNode;
    var property;
    var computed;
    var args;
    var thisReference;

    var parent = path.parent;
    var node = path.node;

    if (isIllegalBareSuper(node, parent)) {
      throw path.errorWithNode(messages.get("classesIllegalBareSuper"));
    }

    if (t.isCallExpression(node)) {
      var callee = node.callee;
      if (t.isSuper(callee)) {
        // super(); -> _get(Object.getPrototypeOf(objectRef), "MethodName", this).call(this);
        property = methodNode.key;
        computed = methodNode.computed;
        args = node.arguments;

        // bare `super` call is illegal inside non-constructors
        //  - https://esdiscuss.org/topic/super-call-in-methods
        //  - https://twitter.com/wycats/status/544553184396836864
        if (methodNode.key.name !== "constructor" || !this.inClass) {
          var methodName = methodNode.key.name || "METHOD_NAME";
          throw this.file.errorWithNode(node, messages.get("classesIllegalSuperCall", methodName));
        }
      } else if (isMemberExpressionSuper(callee)) {
        // super.test(); -> _get(Object.getPrototypeOf(objectRef.prototype), "test", this).call(this);
        property = callee.property;
        computed = callee.computed;
        args = node.arguments;
      }
    } else if (t.isMemberExpression(node) && t.isSuper(node.object)) {
      // super.name; -> _get(Object.getPrototypeOf(objectRef.prototype), "name", this);
      property = node.property;
      computed = node.computed;
    } else if (t.isUpdateExpression(node) && isMemberExpressionSuper(node.argument)) {
      var binary = t.binaryExpression(node.operator[0], node.argument, t.literal(1));
      if (node.prefix) {
        // ++super.foo; -> super.foo += 1;
        return this.specHandleAssignmentExpression(null, path, binary, getThisReference);
      } else {
        // super.foo++; -> var _ref = super.foo; super.foo = _ref + 1;
        var ref = path.scope.generateUidIdentifier("ref");
        return this.specHandleAssignmentExpression(ref, path, binary, getThisReference).concat(t.expressionStatement(ref));
      }
    } else if (t.isAssignmentExpression(node) && isMemberExpressionSuper(node.left)) {
      return this.specHandleAssignmentExpression(null, path, node, getThisReference);
    }

    if (!property) return;

    thisReference = getThisReference();
    var superProperty = this.getSuperProperty(property, computed, thisReference);
    if (args) {
      if (args.length === 1 && t.isSpreadElement(args[0])) {
        // super(...arguments);
        return t.callExpression(t.memberExpression(superProperty, t.identifier("apply")), [thisReference, args[0].argument]);
      } else {
        return t.callExpression(t.memberExpression(superProperty, t.identifier("call")), [thisReference].concat(args));
      }
    } else {
      return superProperty;
    }
  };

  return ReplaceSupers;
})();

exports["default"] = ReplaceSupers;
module.exports = exports["default"];
},{"../../messages":46,"../../types":167}],69:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.has = has;
exports.wrap = wrap;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function has(node) {
  var first = node.body[0];
  return t.isExpressionStatement(first) && t.isLiteral(first.expression, { value: "use strict" });
}

function wrap(node, callback) {
  var useStrictNode;
  if (has(node)) {
    useStrictNode = node.body.shift();
  }

  callback();

  if (useStrictNode) {
    node.body.unshift(useStrictNode);
  }
}
},{"../../types":167}],70:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _transformerPipeline = require("./transformer-pipeline");

var _transformerPipeline2 = _interopRequireDefault(_transformerPipeline);

//

var _transformers = require("./transformers");

var _transformers2 = _interopRequireDefault(_transformers);

//

var _transformersDeprecated = require("./transformers/deprecated");

var _transformersDeprecated2 = _interopRequireDefault(_transformersDeprecated);

//

var _transformersAliases = require("./transformers/aliases");

var _transformersAliases2 = _interopRequireDefault(_transformersAliases);

//

var _transformersFilters = require("./transformers/filters");

var filters = _interopRequireWildcard(_transformersFilters);

var pipeline = new _transformerPipeline2["default"]();

for (var key in _transformers2["default"]) {
  var transformer = _transformers2["default"][key];
  var metadata = transformer.metadata = transformer.metadata || {};
  metadata.group = metadata.group || "builtin-basic";
}

pipeline.addTransformers(_transformers2["default"]);
pipeline.addDeprecated(_transformersDeprecated2["default"]);
pipeline.addAliases(_transformersAliases2["default"]);
pipeline.addFilter(filters.internal);
pipeline.addFilter(filters.blacklist);
pipeline.addFilter(filters.whitelist);
pipeline.addFilter(filters.stage);
pipeline.addFilter(filters.optional);

//

var transform = pipeline.transform.bind(pipeline);
transform.fromAst = pipeline.transformFromAst.bind(pipeline);
transform.pipeline = pipeline;
exports["default"] = transform;
module.exports = exports["default"];
},{"./transformer-pipeline":83,"./transformers":120,"./transformers/aliases":85,"./transformers/deprecated":86,"./transformers/filters":119}],71:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _messages = require("../../messages");

var messages = _interopRequireWildcard(_messages);

var _traversal = require("../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

var _helpersObject = require("../../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var remapVisitor = {
  enter: function enter(node, parent, scope, formatter) {
    if (node._skipModulesRemap) {
      return this.skip();
    }
  },

  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, formatter) {
    var remap = formatter.internalRemap[node.name];

    if (remap && node !== remap) {
      if (!scope.hasBinding(node.name) || scope.bindingIdentifierEquals(node.name, formatter.localImports[node.name])) {
        if (this.key === "callee" && this.parentPath.isCallExpression()) {
          return t.sequenceExpression([t.literal(0), remap]);
        } else {
          return remap;
        }
      }
    }
  },

  AssignmentExpression: {
    exit: function exit(node, parent, scope, formatter) {
      if (!node._ignoreModulesRemap) {
        var exported = formatter.getExport(node.left, scope);
        if (exported) {
          return formatter.remapExportAssignment(node, exported);
        }
      }
    }
  },

  UpdateExpression: function UpdateExpression(node, parent, scope, formatter) {
    var exported = formatter.getExport(node.argument, scope);
    if (!exported) return;

    this.skip();

    // expand to long file assignment expression
    var assign = t.assignmentExpression(node.operator[0] + "=", node.argument, t.literal(1));

    // remap this assignment expression
    var remapped = formatter.remapExportAssignment(assign, exported);

    // we don't need to change the result
    if (t.isExpressionStatement(parent) || node.prefix) {
      return remapped;
    }

    var nodes = [];
    nodes.push(remapped);

    var operator;
    if (node.operator === "--") {
      operator = "+";
    } else {
      // "++"
      operator = "-";
    }
    nodes.push(t.binaryExpression(operator, node.argument, t.literal(1)));

    return t.sequenceExpression(nodes);
  }
};

var importsVisitor = {
  ImportDeclaration: {
    enter: function enter(node, parent, scope, formatter) {
      formatter.hasLocalImports = true;
      (0, _lodashObjectExtend2["default"])(formatter.localImports, this.getBindingIdentifiers());
    }
  }
};

var exportsVisitor = {
  ExportDeclaration: {
    enter: function enter(node, parent, scope, formatter) {
      formatter.hasLocalExports = true;

      var declar = this.get("declaration");
      if (declar.isStatement()) {
        var bindings = declar.getBindingIdentifiers();
        for (var name in bindings) {
          var binding = bindings[name];
          formatter._addExport(name, binding);
        }
      }

      if (this.isExportNamedDeclaration() && node.specifiers) {
        for (var i = 0; i < node.specifiers.length; i++) {
          var specifier = node.specifiers[i];
          var local = specifier.local;
          if (!local) continue;

          formatter._addExport(local.name, specifier.exported);
        }
      }

      if (!t.isExportDefaultDeclaration(node)) {
        var onlyDefault = node.specifiers && node.specifiers.length === 1 && t.isSpecifierDefault(node.specifiers[0]);
        if (!onlyDefault) {
          formatter.hasNonDefaultExports = true;
        }
      }
    }
  }
};

var DefaultFormatter = (function () {
  function DefaultFormatter(file) {
    _classCallCheck(this, DefaultFormatter);

    this.internalRemap = (0, _helpersObject2["default"])();
    this.defaultIds = (0, _helpersObject2["default"])();
    this.scope = file.scope;
    this.file = file;
    this.ids = (0, _helpersObject2["default"])();

    this.hasNonDefaultExports = false;

    this.hasLocalExports = false;
    this.hasLocalImports = false;

    this.localExports = (0, _helpersObject2["default"])();
    this.localImports = (0, _helpersObject2["default"])();

    this.getLocalExports();
    this.getLocalImports();
  }

  DefaultFormatter.prototype.isModuleType = function isModuleType(node, type) {
    var modules = this.file.dynamicImportTypes[type];
    return modules && modules.indexOf(node) >= 0;
  };

  DefaultFormatter.prototype.transform = function transform() {
    this.remapAssignments();
  };

  DefaultFormatter.prototype.doDefaultExportInterop = function doDefaultExportInterop(node) {
    return (t.isExportDefaultDeclaration(node) || t.isSpecifierDefault(node)) && !this.noInteropRequireExport && !this.hasNonDefaultExports;
  };

  DefaultFormatter.prototype.getLocalExports = function getLocalExports() {
    this.file.path.traverse(exportsVisitor, this);
  };

  DefaultFormatter.prototype.getLocalImports = function getLocalImports() {
    this.file.path.traverse(importsVisitor, this);
  };

  DefaultFormatter.prototype.remapAssignments = function remapAssignments() {
    if (this.hasLocalExports || this.hasLocalImports) {
      this.file.path.traverse(remapVisitor, this);
    }
  };

  DefaultFormatter.prototype.remapExportAssignment = function remapExportAssignment(node, exported) {
    var assign = node;

    for (var i = 0; i < exported.length; i++) {
      assign = t.assignmentExpression("=", t.memberExpression(t.identifier("exports"), exported[i]), assign);
    }

    return assign;
  };

  DefaultFormatter.prototype._addExport = function _addExport(name, exported) {
    var info = this.localExports[name] = this.localExports[name] || {
      binding: this.scope.getBindingIdentifier(name),
      exported: []
    };
    info.exported.push(exported);
  };

  DefaultFormatter.prototype.getExport = function getExport(node, scope) {
    if (!t.isIdentifier(node)) return;

    var local = this.localExports[node.name];
    if (local && local.binding === scope.getBindingIdentifier(node.name)) {
      return local.exported;
    }
  };

  DefaultFormatter.prototype.getModuleName = function getModuleName() {
    var opts = this.file.opts;
    // moduleId is n/a if a `getModuleId()` is provided
    if (opts.moduleId && !opts.getModuleId) {
      return opts.moduleId;
    }

    var filenameRelative = opts.filenameRelative;
    var moduleName = "";

    if (opts.moduleRoot) {
      moduleName = opts.moduleRoot + "/";
    }

    if (!opts.filenameRelative) {
      return moduleName + opts.filename.replace(/^\//, "");
    }

    if (opts.sourceRoot) {
      // remove sourceRoot from filename
      var sourceRootRegEx = new RegExp("^" + opts.sourceRoot + "/?");
      filenameRelative = filenameRelative.replace(sourceRootRegEx, "");
    }

    if (!opts.keepModuleIdExtensions) {
      // remove extension
      filenameRelative = filenameRelative.replace(/\.(\w*?)$/, "");
    }

    moduleName += filenameRelative;

    // normalize path separators
    moduleName = moduleName.replace(/\\/g, "/");

    if (opts.getModuleId) {
      // If return is falsy, assume they want us to use our generated default name
      return opts.getModuleId(moduleName) || moduleName;
    } else {
      return moduleName;
    }
  };

  DefaultFormatter.prototype._pushStatement = function _pushStatement(ref, nodes) {
    if (t.isClass(ref) || t.isFunction(ref)) {
      if (ref.id) {
        nodes.push(t.toStatement(ref));
        ref = ref.id;
      }
    }

    return ref;
  };

  DefaultFormatter.prototype._hoistExport = function _hoistExport(declar, assign, priority) {
    if (t.isFunctionDeclaration(declar)) {
      assign._blockHoist = priority || 2;
    }

    return assign;
  };

  DefaultFormatter.prototype.getExternalReference = function getExternalReference(node, nodes) {
    var ids = this.ids;
    var id = node.source.value;

    if (ids[id]) {
      return ids[id];
    } else {
      return this.ids[id] = this._getExternalReference(node, nodes);
    }
  };

  DefaultFormatter.prototype.checkExportIdentifier = function checkExportIdentifier(node) {
    if (t.isIdentifier(node, { name: "__esModule" })) {
      throw this.file.errorWithNode(node, messages.get("modulesIllegalExportName", node.name));
    }
  };

  DefaultFormatter.prototype.exportAllDeclaration = function exportAllDeclaration(node, nodes) {
    var ref = this.getExternalReference(node, nodes);
    nodes.push(this.buildExportsWildcard(ref, node));
  };

  DefaultFormatter.prototype.isLoose = function isLoose() {
    return this.file.isLoose("es6.modules");
  };

  DefaultFormatter.prototype.exportSpecifier = function exportSpecifier(specifier, node, nodes) {
    if (node.source) {
      var ref = this.getExternalReference(node, nodes);

      if (specifier.local.name === "default" && !this.noInteropRequireExport) {
        // importing a default so we need to normalize it
        ref = t.callExpression(this.file.addHelper("interop-require"), [ref]);
      } else {
        ref = t.memberExpression(ref, specifier.local);

        if (!this.isLoose()) {
          nodes.push(this.buildExportsFromAssignment(specifier.exported, ref, node));
          return;
        }
      }

      // export { foo } from "test";
      nodes.push(this.buildExportsAssignment(specifier.exported, ref, node));
    } else {
      // export { foo };
      nodes.push(this.buildExportsAssignment(specifier.exported, specifier.local, node));
    }
  };

  DefaultFormatter.prototype.buildExportsWildcard = function buildExportsWildcard(objectIdentifier) {
    return t.expressionStatement(t.callExpression(this.file.addHelper("defaults"), [t.identifier("exports"), t.callExpression(this.file.addHelper("interop-require-wildcard"), [objectIdentifier])]));
  };

  DefaultFormatter.prototype.buildExportsFromAssignment = function buildExportsFromAssignment(id, init) {
    this.checkExportIdentifier(id);
    return util.template("exports-from-assign", {
      INIT: init,
      ID: t.literal(id.name)
    }, true);
  };

  DefaultFormatter.prototype.buildExportsAssignment = function buildExportsAssignment(id, init) {
    this.checkExportIdentifier(id);
    return util.template("exports-assign", {
      VALUE: init,
      KEY: id
    }, true);
  };

  DefaultFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    var declar = node.declaration;

    var id = declar.id;

    if (t.isExportDefaultDeclaration(node)) {
      id = t.identifier("default");
    }

    var assign;

    if (t.isVariableDeclaration(declar)) {
      for (var i = 0; i < declar.declarations.length; i++) {
        var decl = declar.declarations[i];

        decl.init = this.buildExportsAssignment(decl.id, decl.init, node).expression;

        var newDeclar = t.variableDeclaration(declar.kind, [decl]);
        if (i === 0) t.inherits(newDeclar, declar);
        nodes.push(newDeclar);
      }
    } else {
      var ref = declar;

      if (t.isFunctionDeclaration(declar) || t.isClassDeclaration(declar)) {
        ref = declar.id;
        nodes.push(declar);
      }

      assign = this.buildExportsAssignment(id, ref, node);

      nodes.push(assign);

      this._hoistExport(declar, assign);
    }
  };

  return DefaultFormatter;
})();

exports["default"] = DefaultFormatter;
module.exports = exports["default"];
},{"../../helpers/object":44,"../../messages":46,"../../traversal":156,"../../types":167,"../../util":171,"lodash/object/extend":417}],72:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

exports["default"] = function (Parent) {
  var Constructor = function Constructor() {
    this.noInteropRequireImport = true;
    this.noInteropRequireExport = true;
    Parent.apply(this, arguments);
  };

  util.inherits(Constructor, Parent);

  return Constructor;
};

;
module.exports = exports["default"];
},{"../../util":171}],73:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _amd = require("./amd");

var _amd2 = _interopRequireDefault(_amd);

var _strict = require("./_strict");

var _strict2 = _interopRequireDefault(_strict);

exports["default"] = (0, _strict2["default"])(_amd2["default"]);
module.exports = exports["default"];
},{"./_strict":72,"./amd":74}],74:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _default = require("./_default");

var _default2 = _interopRequireDefault(_default);

var _common = require("./common");

var _common2 = _interopRequireDefault(_common);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _lodashObjectValues = require("lodash/object/values");

var _lodashObjectValues2 = _interopRequireDefault(_lodashObjectValues);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var AMDFormatter = (function (_DefaultFormatter) {
  function AMDFormatter() {
    _classCallCheck(this, AMDFormatter);

    if (_DefaultFormatter != null) {
      _DefaultFormatter.apply(this, arguments);
    }
  }

  _inherits(AMDFormatter, _DefaultFormatter);

  AMDFormatter.prototype.init = function init() {
    _common2["default"].prototype._init.call(this, this.hasNonDefaultExports);
  };

  AMDFormatter.prototype.buildDependencyLiterals = function buildDependencyLiterals() {
    var names = [];
    for (var name in this.ids) {
      names.push(t.literal(name));
    }
    return names;
  };

  /**
   * Wrap the entire body in a `define` wrapper.
   */

  AMDFormatter.prototype.transform = function transform(program) {
    _common2["default"].prototype.transform.apply(this, arguments);

    var body = program.body;

    // build an array of module names

    var names = [t.literal("exports")];
    if (this.passModuleArg) names.push(t.literal("module"));
    names = names.concat(this.buildDependencyLiterals());
    names = t.arrayExpression(names);

    // build up define container

    var params = (0, _lodashObjectValues2["default"])(this.ids);
    if (this.passModuleArg) params.unshift(t.identifier("module"));
    params.unshift(t.identifier("exports"));

    var container = t.functionExpression(null, params, t.blockStatement(body));

    var defineArgs = [names, container];
    var moduleName = this.getModuleName();
    if (moduleName) defineArgs.unshift(t.literal(moduleName));

    var call = t.callExpression(t.identifier("define"), defineArgs);

    program.body = [t.expressionStatement(call)];
  };

  /**
   * Get the AMD module name that we'll prepend to the wrapper
   * to define this module
   */

  AMDFormatter.prototype.getModuleName = function getModuleName() {
    if (this.file.opts.moduleIds) {
      return _default2["default"].prototype.getModuleName.apply(this, arguments);
    } else {
      return null;
    }
  };

  AMDFormatter.prototype._getExternalReference = function _getExternalReference(node) {
    return this.scope.generateUidIdentifier(node.source.value);
  };

  AMDFormatter.prototype.importDeclaration = function importDeclaration(node) {
    this.getExternalReference(node);
  };

  AMDFormatter.prototype.importSpecifier = function importSpecifier(specifier, node, nodes) {
    var key = node.source.value;
    var ref = this.getExternalReference(node);

    if (t.isImportNamespaceSpecifier(specifier) || t.isImportDefaultSpecifier(specifier)) {
      this.defaultIds[key] = specifier.local;
    }

    if (this.isModuleType(node, "absolute")) {} else if (this.isModuleType(node, "absoluteDefault")) {
      // prevent unnecessary renaming of dynamic imports
      this.ids[node.source.value] = ref;
      ref = t.memberExpression(ref, t.identifier("default"));
    } else if (t.isImportNamespaceSpecifier(specifier)) {} else if (!(0, _lodashCollectionIncludes2["default"])(this.file.dynamicImported, node) && t.isSpecifierDefault(specifier) && !this.noInteropRequireImport) {
      // import foo from "foo";
      var uid = this.scope.generateUidIdentifier(specifier.local.name);
      nodes.push(t.variableDeclaration("var", [t.variableDeclarator(uid, t.callExpression(this.file.addHelper("interop-require"), [ref]))]));
      ref = uid;
    } else {
      // import { foo } from "foo";
      var imported = specifier.imported;
      if (t.isSpecifierDefault(specifier)) imported = t.identifier("default");
      ref = t.memberExpression(ref, imported);
    }

    this.internalRemap[specifier.local.name] = ref;
  };

  AMDFormatter.prototype.exportSpecifier = function exportSpecifier(specifier, node, nodes) {
    if (this.doDefaultExportInterop(specifier)) {
      this.passModuleArg = true;

      if (specifier.exported !== specifier.local && !node.source) {
        nodes.push(util.template("exports-default-assign", {
          VALUE: specifier.local
        }, true));
        return;
      }
    }

    _common2["default"].prototype.exportSpecifier.apply(this, arguments);
  };

  AMDFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    if (this.doDefaultExportInterop(node)) {
      this.passModuleArg = true;

      var declar = node.declaration;
      var assign = util.template("exports-default-assign", {
        VALUE: this._pushStatement(declar, nodes)
      }, true);

      if (t.isFunctionDeclaration(declar)) {
        // we can hoist this assignment to the top of the file
        assign._blockHoist = 3;
      }

      nodes.push(assign);
      return;
    }

    _default2["default"].prototype.exportDeclaration.apply(this, arguments);
  };

  return AMDFormatter;
})(_default2["default"]);

exports["default"] = AMDFormatter;
module.exports = exports["default"];

// absolute module reference

// import * as bar from "foo";
},{"../../types":167,"../../util":171,"./_default":71,"./common":76,"lodash/collection/includes":330,"lodash/object/values":422}],75:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _common = require("./common");

var _common2 = _interopRequireDefault(_common);

var _strict = require("./_strict");

var _strict2 = _interopRequireDefault(_strict);

exports["default"] = (0, _strict2["default"])(_common2["default"]);
module.exports = exports["default"];
},{"./_strict":72,"./common":76}],76:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _default = require("./_default");

var _default2 = _interopRequireDefault(_default);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var CommonJSFormatter = (function (_DefaultFormatter) {
  function CommonJSFormatter() {
    _classCallCheck(this, CommonJSFormatter);

    if (_DefaultFormatter != null) {
      _DefaultFormatter.apply(this, arguments);
    }
  }

  _inherits(CommonJSFormatter, _DefaultFormatter);

  CommonJSFormatter.prototype.init = function init() {
    this._init(this.hasLocalExports);
  };

  CommonJSFormatter.prototype._init = function _init(conditional) {
    var file = this.file;
    var scope = file.scope;

    scope.rename("module");
    scope.rename("exports");

    if (!this.noInteropRequireImport && conditional) {
      var templateName = "exports-module-declaration";
      if (this.file.isLoose("es6.modules")) templateName += "-loose";
      var declar = util.template(templateName, true);
      declar._blockHoist = 3;
      file.path.unshiftContainer("body", [declar]);
    }
  };

  CommonJSFormatter.prototype.transform = function transform(program) {
    _default2["default"].prototype.transform.apply(this, arguments);

    if (this.hasDefaultOnlyExport) {
      program.body.push(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.identifier("module"), t.identifier("exports")), t.memberExpression(t.identifier("exports"), t.identifier("default")))));
    }
  };

  CommonJSFormatter.prototype.importSpecifier = function importSpecifier(specifier, node, nodes) {
    var variableName = specifier.local;

    var ref = this.getExternalReference(node, nodes);

    // import foo from "foo";
    if (t.isSpecifierDefault(specifier)) {
      if (this.isModuleType(node, "absolute")) {} else if (this.isModuleType(node, "absoluteDefault")) {
        this.internalRemap[variableName.name] = ref;
      } else if (this.noInteropRequireImport) {
        this.internalRemap[variableName.name] = t.memberExpression(ref, t.identifier("default"));
      } else {
        var uid = this.scope.generateUidBasedOnNode(node, "import");

        nodes.push(t.variableDeclaration("var", [t.variableDeclarator(uid, t.callExpression(this.file.addHelper("interop-require-default"), [ref]))]));

        this.internalRemap[variableName.name] = t.memberExpression(uid, t.identifier("default"));
      }
    } else {
      if (t.isImportNamespaceSpecifier(specifier)) {
        if (!this.noInteropRequireImport) {
          ref = t.callExpression(this.file.addHelper("interop-require-wildcard"), [ref]);
        }

        // import * as bar from "foo";
        nodes.push(t.variableDeclaration("var", [t.variableDeclarator(variableName, ref)]));
      } else {
        // import { foo } from "foo";
        this.internalRemap[variableName.name] = t.memberExpression(ref, specifier.imported);
      }
    }
  };

  CommonJSFormatter.prototype.importDeclaration = function importDeclaration(node, nodes) {
    // import "foo";
    nodes.push(util.template("require", {
      MODULE_NAME: node.source
    }, true));
  };

  CommonJSFormatter.prototype.exportSpecifier = function exportSpecifier(specifier, node, nodes) {
    if (this.doDefaultExportInterop(specifier)) {
      this.hasDefaultOnlyExport = true;
    }

    _default2["default"].prototype.exportSpecifier.apply(this, arguments);
  };

  CommonJSFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    if (this.doDefaultExportInterop(node)) {
      this.hasDefaultOnlyExport = true;
    }

    _default2["default"].prototype.exportDeclaration.apply(this, arguments);
  };

  CommonJSFormatter.prototype._getExternalReference = function _getExternalReference(node, nodes) {
    var source = node.source.value;

    var call = t.callExpression(t.identifier("require"), [node.source]);
    var uid;

    if (this.isModuleType(node, "absolute")) {} else if (this.isModuleType(node, "absoluteDefault")) {
      call = t.memberExpression(call, t.identifier("default"));
    } else {
      uid = this.scope.generateUidBasedOnNode(node, "import");
    }

    uid = uid || node.specifiers[0].local;

    var declar = t.variableDeclaration("var", [t.variableDeclarator(uid, call)]);
    nodes.push(declar);
    return uid;
  };

  return CommonJSFormatter;
})(_default2["default"]);

exports["default"] = CommonJSFormatter;
module.exports = exports["default"];

// absolute module reference

// absolute module reference
},{"../../types":167,"../../util":171,"./_default":71,"lodash/collection/includes":330}],77:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var IgnoreFormatter = (function () {
  function IgnoreFormatter() {
    _classCallCheck(this, IgnoreFormatter);
  }

  IgnoreFormatter.prototype.exportDeclaration = function exportDeclaration(node, nodes) {
    var declar = t.toStatement(node.declaration, true);
    if (declar) nodes.push(t.inherits(declar, node));
  };

  IgnoreFormatter.prototype.exportAllDeclaration = function exportAllDeclaration() {};

  IgnoreFormatter.prototype.importDeclaration = function importDeclaration() {};

  IgnoreFormatter.prototype.importSpecifier = function importSpecifier() {};

  IgnoreFormatter.prototype.exportSpecifier = function exportSpecifier() {};

  return IgnoreFormatter;
})();

exports["default"] = IgnoreFormatter;
module.exports = exports["default"];
},{"../../types":167}],78:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = {
  commonStrict: require("./common-strict"),
  amdStrict: require("./amd-strict"),
  umdStrict: require("./umd-strict"),
  common: require("./common"),
  system: require("./system"),
  ignore: require("./ignore"),
  amd: require("./amd"),
  umd: require("./umd")
};
module.exports = exports["default"];
},{"./amd":74,"./amd-strict":73,"./common":76,"./common-strict":75,"./ignore":77,"./system":79,"./umd":81,"./umd-strict":80}],79:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _default = require("./_default");

var _default2 = _interopRequireDefault(_default);

var _amd = require("./amd");

var _amd2 = _interopRequireDefault(_amd);

var _helpersObject = require("../../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _lodashArrayLast = require("lodash/array/last");

var _lodashArrayLast2 = _interopRequireDefault(_lodashArrayLast);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashCollectionMap = require("lodash/collection/map");

var _lodashCollectionMap2 = _interopRequireDefault(_lodashCollectionMap);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var hoistVariablesVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (t.isFunction(node)) {
      // nothing inside is accessible
      return this.skip();
    }

    if (t.isVariableDeclaration(node)) {
      if (node.kind !== "var" && !t.isProgram(parent)) {
        // let, const
        // can't be accessed
        return;
      }

      // ignore block hoisted nodes as these can be left in
      if (state.formatter.canHoist(node)) return;

      var nodes = [];

      for (var i = 0; i < node.declarations.length; i++) {
        var declar = node.declarations[i];
        state.hoistDeclarators.push(t.variableDeclarator(declar.id));
        if (declar.init) {
          // no initializer so we can just hoist it as-is
          var assign = t.expressionStatement(t.assignmentExpression("=", declar.id, declar.init));
          nodes.push(assign);
        }
      }

      // for (var i in test)
      // for (var i = 0;;)
      if (t.isFor(parent) && parent.left === node) {
        return node.declarations[0].id;
      }

      return nodes;
    }
  }
};

var hoistFunctionsVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (t.isFunction(node)) this.skip();

    if (t.isFunctionDeclaration(node) || state.formatter.canHoist(node)) {
      state.handlerBody.push(node);
      this.remove();
    }
  }
};

var runnerSettersVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (node._importSource === state.source) {
      if (t.isVariableDeclaration(node)) {
        var _arr = node.declarations;

        for (var _i = 0; _i < _arr.length; _i++) {
          var declar = _arr[_i];
          state.hoistDeclarators.push(t.variableDeclarator(declar.id));
          state.nodes.push(t.expressionStatement(t.assignmentExpression("=", declar.id, declar.init)));
        }
      } else {
        state.nodes.push(node);
      }

      this.remove();
    }
  }
};

var SystemFormatter = (function (_AMDFormatter) {
  function SystemFormatter(file) {
    _classCallCheck(this, SystemFormatter);

    _AMDFormatter.call(this, file);

    this.exportIdentifier = file.scope.generateUidIdentifier("export");
    this.noInteropRequireExport = true;
    this.noInteropRequireImport = true;
  }

  _inherits(SystemFormatter, _AMDFormatter);

  SystemFormatter.prototype._addImportSource = function _addImportSource(node, exportNode) {
    if (node) node._importSource = exportNode.source && exportNode.source.value;
    return node;
  };

  SystemFormatter.prototype.buildExportsWildcard = function buildExportsWildcard(objectIdentifier, node) {
    var leftIdentifier = this.scope.generateUidIdentifier("key");
    var valIdentifier = t.memberExpression(objectIdentifier, leftIdentifier, true);

    var left = t.variableDeclaration("var", [t.variableDeclarator(leftIdentifier)]);

    var right = objectIdentifier;

    var block = t.blockStatement([t.expressionStatement(this.buildExportCall(leftIdentifier, valIdentifier))]);

    return this._addImportSource(t.forInStatement(left, right, block), node);
  };

  SystemFormatter.prototype.buildExportsAssignment = function buildExportsAssignment(id, init, node) {
    var call = this.buildExportCall(t.literal(id.name), init, true);
    return this._addImportSource(call, node);
  };

  SystemFormatter.prototype.buildExportsFromAssignment = function buildExportsFromAssignment() {
    return this.buildExportsAssignment.apply(this, arguments);
  };

  SystemFormatter.prototype.remapExportAssignment = function remapExportAssignment(node, exported) {
    var assign = node;

    for (var i = 0; i < exported.length; i++) {
      assign = this.buildExportCall(t.literal(exported[i].name), assign);
    }

    return assign;
  };

  SystemFormatter.prototype.buildExportCall = function buildExportCall(id, init, isStatement) {
    var call = t.callExpression(this.exportIdentifier, [id, init]);
    if (isStatement) {
      return t.expressionStatement(call);
    } else {
      return call;
    }
  };

  SystemFormatter.prototype.importSpecifier = function importSpecifier(specifier, node, nodes) {
    _amd2["default"].prototype.importSpecifier.apply(this, arguments);

    for (var name in this.internalRemap) {
      nodes.push(t.variableDeclaration("var", [t.variableDeclarator(t.identifier(name), this.internalRemap[name])]));
    }

    this.internalRemap = (0, _helpersObject2["default"])();

    this._addImportSource((0, _lodashArrayLast2["default"])(nodes), node);
  };

  SystemFormatter.prototype.buildRunnerSetters = function buildRunnerSetters(block, hoistDeclarators) {
    var scope = this.file.scope;

    return t.arrayExpression((0, _lodashCollectionMap2["default"])(this.ids, function (uid, source) {
      var state = {
        hoistDeclarators: hoistDeclarators,
        source: source,
        nodes: []
      };

      scope.traverse(block, runnerSettersVisitor, state);

      return t.functionExpression(null, [uid], t.blockStatement(state.nodes));
    }));
  };

  SystemFormatter.prototype.canHoist = function canHoist(node) {
    return node._blockHoist && !this.file.dynamicImports.length;
  };

  SystemFormatter.prototype.transform = function transform(program) {
    _default2["default"].prototype.transform.apply(this, arguments);

    var hoistDeclarators = [];
    var moduleName = this.getModuleName();
    var moduleNameLiteral = t.literal(moduleName);

    var block = t.blockStatement(program.body);

    var runner = util.template("system", {
      MODULE_DEPENDENCIES: t.arrayExpression(this.buildDependencyLiterals()),
      EXPORT_IDENTIFIER: this.exportIdentifier,
      MODULE_NAME: moduleNameLiteral,
      SETTERS: this.buildRunnerSetters(block, hoistDeclarators),
      EXECUTE: t.functionExpression(null, [], block)
    }, true);

    var handlerBody = runner.expression.arguments[2].body.body;
    if (!moduleName) runner.expression.arguments.shift();

    var returnStatement = handlerBody.pop();

    // hoist up all variable declarations
    this.file.scope.traverse(block, hoistVariablesVisitor, {
      formatter: this,
      hoistDeclarators: hoistDeclarators
    });

    if (hoistDeclarators.length) {
      var hoistDeclar = t.variableDeclaration("var", hoistDeclarators);
      hoistDeclar._blockHoist = true;
      handlerBody.unshift(hoistDeclar);
    }

    // hoist up function declarations for circular references
    this.file.scope.traverse(block, hoistFunctionsVisitor, {
      formatter: this,
      handlerBody: handlerBody
    });

    handlerBody.push(returnStatement);

    program.body = [runner];
  };

  return SystemFormatter;
})(_amd2["default"]);

exports["default"] = SystemFormatter;
module.exports = exports["default"];
},{"../../helpers/object":44,"../../types":167,"../../util":171,"./_default":71,"./amd":74,"lodash/array/last":324,"lodash/collection/each":328,"lodash/collection/map":331}],80:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _umd = require("./umd");

var _umd2 = _interopRequireDefault(_umd);

var _strict = require("./_strict");

var _strict2 = _interopRequireDefault(_strict);

exports["default"] = (0, _strict2["default"])(_umd2["default"]);
module.exports = exports["default"];
},{"./_strict":72,"./umd":81}],81:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _default = require("./_default");

var _default2 = _interopRequireDefault(_default);

var _amd = require("./amd");

var _amd2 = _interopRequireDefault(_amd);

var _lodashObjectValues = require("lodash/object/values");

var _lodashObjectValues2 = _interopRequireDefault(_lodashObjectValues);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _util = require("../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var UMDFormatter = (function (_AMDFormatter) {
  function UMDFormatter() {
    _classCallCheck(this, UMDFormatter);

    if (_AMDFormatter != null) {
      _AMDFormatter.apply(this, arguments);
    }
  }

  _inherits(UMDFormatter, _AMDFormatter);

  UMDFormatter.prototype.transform = function transform(program) {
    _default2["default"].prototype.transform.apply(this, arguments);

    var body = program.body;

    // build an array of module names

    var names = [];
    for (var _name in this.ids) {
      names.push(t.literal(_name));
    }

    // factory

    var ids = (0, _lodashObjectValues2["default"])(this.ids);
    var args = [t.identifier("exports")];
    if (this.passModuleArg) args.push(t.identifier("module"));
    args = args.concat(ids);

    var factory = t.functionExpression(null, args, t.blockStatement(body));

    // amd

    var defineArgs = [t.literal("exports")];
    if (this.passModuleArg) defineArgs.push(t.literal("module"));
    defineArgs = defineArgs.concat(names);
    defineArgs = [t.arrayExpression(defineArgs)];

    // common

    var testExports = util.template("test-exports");
    var testModule = util.template("test-module");
    var commonTests = this.passModuleArg ? t.logicalExpression("&&", testExports, testModule) : testExports;

    var commonArgs = [t.identifier("exports")];
    if (this.passModuleArg) commonArgs.push(t.identifier("module"));
    commonArgs = commonArgs.concat(names.map(function (name) {
      return t.callExpression(t.identifier("require"), [name]);
    }));

    // globals

    var browserArgs = [];
    if (this.passModuleArg) browserArgs.push(t.identifier("mod"));

    for (var _name2 in this.ids) {
      var id = this.defaultIds[_name2] || t.identifier(t.toIdentifier(_path2["default"].basename(_name2, _path2["default"].extname(_name2))));
      browserArgs.push(t.memberExpression(t.identifier("global"), id));
    }

    //

    var moduleName = this.getModuleName();
    if (moduleName) defineArgs.unshift(t.literal(moduleName));

    //
    var globalArg = this.file.opts.basename;
    if (moduleName) globalArg = moduleName;
    globalArg = t.identifier(t.toIdentifier(globalArg));

    var runner = util.template("umd-runner-body", {
      AMD_ARGUMENTS: defineArgs,
      COMMON_TEST: commonTests,
      COMMON_ARGUMENTS: commonArgs,
      BROWSER_ARGUMENTS: browserArgs,
      GLOBAL_ARG: globalArg
    });

    //

    program.body = [t.expressionStatement(t.callExpression(runner, [t.thisExpression(), factory]))];
  };

  return UMDFormatter;
})(_amd2["default"]);

exports["default"] = UMDFormatter;
module.exports = exports["default"];
},{"../../types":167,"../../util":171,"./_default":71,"./amd":74,"lodash/object/values":422,"path":197}],82:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _traversal = require("../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

/**
 * This class is responsible for traversing over the provided `File`s
 * AST and running it's parent transformers handlers over it.
 */

var TransformerPass = (function () {
  function TransformerPass(file, transformer) {
    _classCallCheck(this, TransformerPass);

    this.transformer = transformer;
    this.handlers = transformer.handlers;
    this.file = file;
    this.ran = false;
    this.key = transformer.key;
  }

  TransformerPass.prototype.canTransform = function canTransform() {
    return this.file.transformerDependencies[this.key] || this.file.pipeline.canTransform(this.transformer, this.file.opts);
  };

  TransformerPass.prototype.transform = function transform() {
    var file = this.file;

    file.log.debug("Start transformer " + this.key);

    (0, _traversal2["default"])(file.ast, this.handlers, file.scope, file);

    file.log.debug("Finish transformer " + this.key);

    this.ran = true;
  };

  return TransformerPass;
})();

exports["default"] = TransformerPass;
module.exports = exports["default"];
},{"../traversal":156,"lodash/collection/includes":330}],83:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _transformer = require("./transformer");

var _transformer2 = _interopRequireDefault(_transformer);

var _helpersNormalizeAst = require("../helpers/normalize-ast");

var _helpersNormalizeAst2 = _interopRequireDefault(_helpersNormalizeAst);

var _lodashObjectAssign = require("lodash/object/assign");

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _helpersObject = require("../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _file = require("./file");

var _file2 = _interopRequireDefault(_file);

var TransformerPipeline = (function () {
  function TransformerPipeline() {
    _classCallCheck(this, TransformerPipeline);

    this.transformers = (0, _helpersObject2["default"])();
    this.namespaces = (0, _helpersObject2["default"])();
    this.deprecated = (0, _helpersObject2["default"])();
    this.aliases = (0, _helpersObject2["default"])();
    this.filters = [];
  }

  TransformerPipeline.prototype.addTransformers = function addTransformers(transformers) {
    for (var key in transformers) {
      this.addTransformer(key, transformers[key]);
    }
    return this;
  };

  TransformerPipeline.prototype.addTransformer = function addTransformer(key, transformer) {
    if (this.transformers[key]) throw new Error(); // todo: error

    var namespace = key.split(".")[0];
    this.namespaces[namespace] = this.namespaces[namespace] || [];
    this.namespaces[namespace].push(key);
    this.namespaces[key] = namespace;

    this.transformers[key] = new _transformer2["default"](key, transformer);
  };

  TransformerPipeline.prototype.addAliases = function addAliases(names) {
    (0, _lodashObjectAssign2["default"])(this.aliases, names);
    return this;
  };

  TransformerPipeline.prototype.addDeprecated = function addDeprecated(names) {
    (0, _lodashObjectAssign2["default"])(this.deprecated, names);
    return this;
  };

  TransformerPipeline.prototype.addFilter = function addFilter(filter) {
    this.filters.push(filter);
    return this;
  };

  TransformerPipeline.prototype.canTransform = function canTransform(transformer, fileOpts) {
    if (transformer.metadata.plugin) return true;

    var _arr = this.filters;
    for (var _i = 0; _i < _arr.length; _i++) {
      var filter = _arr[_i];
      var result = filter(transformer, fileOpts);
      if (result != null) return result;
    }

    return true;
  };

  TransformerPipeline.prototype.transform = function transform(code, opts) {
    var file = new _file2["default"](opts, this);
    return file.wrap(code, function () {
      file.addCode(code, true);
    });
  };

  TransformerPipeline.prototype.transformFromAst = function transformFromAst(ast, code, opts) {
    ast = (0, _helpersNormalizeAst2["default"])(ast);

    var file = new _file2["default"](opts, this);
    return file.wrap(code, function () {
      file.addCode(code);
      file.addAst(ast);
    });
  };

  TransformerPipeline.prototype._ensureTransformerNames = function _ensureTransformerNames(type, rawKeys) {
    var keys = [];

    for (var i = 0; i < rawKeys.length; i++) {
      var key = rawKeys[i];

      var deprecatedKey = this.deprecated[key];
      var aliasKey = this.aliases[key];
      if (aliasKey) {
        keys.push(aliasKey);
      } else if (deprecatedKey) {
        // deprecated key, remap it to the new one
        console.error("[BABEL] The transformer " + key + " has been renamed to " + deprecatedKey);
        rawKeys.push(deprecatedKey);
      } else if (this.transformers[key]) {
        // valid key
        keys.push(key);
      } else if (this.namespaces[key]) {
        // namespace, append all transformers within this namespace
        keys = keys.concat(this.namespaces[key]);
      } else {
        // invalid key
        throw new ReferenceError("Unknown transformer " + key + " specified in " + type);
      }
    }

    return keys;
  };

  return TransformerPipeline;
})();

exports["default"] = TransformerPipeline;
module.exports = exports["default"];
},{"../helpers/normalize-ast":43,"../helpers/object":44,"./file":51,"./transformer":84,"lodash/object/assign":415}],84:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _transformerPass = require("./transformer-pass");

var _transformerPass2 = _interopRequireDefault(_transformerPass);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _lodashLangIsFunction = require("lodash/lang/isFunction");

var _lodashLangIsFunction2 = _interopRequireDefault(_lodashLangIsFunction);

var _traversal = require("../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashLangIsObject = require("lodash/lang/isObject");

var _lodashLangIsObject2 = _interopRequireDefault(_lodashLangIsObject);

var _lodashObjectAssign = require("lodash/object/assign");

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _acorn = require("../../acorn");

var acorn = _interopRequireWildcard(_acorn);

var _file = require("./file");

var _file2 = _interopRequireDefault(_file);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

/**
 * This is the class responsible for normalising a transformers handlers
 * as well as constructing a `TransformerPass` that is responsible for
 * actually running the transformer over the provided `File`.
 */

var Transformer = (function () {
  function Transformer(transformerKey, transformer) {
    _classCallCheck(this, Transformer);

    transformer = (0, _lodashObjectAssign2["default"])({}, transformer);

    var take = function take(key) {
      var val = transformer[key];
      delete transformer[key];
      return val;
    };

    this.manipulateOptions = take("manipulateOptions");
    this.metadata = take("metadata") || {};
    this.dependencies = this.metadata.dependencies || [];
    this.parser = take("parser");
    this.post = take("post");
    this.pre = take("pre");

    //

    if (this.metadata.stage != null) {
      this.metadata.optional = true;
    }

    //

    this.handlers = this.normalize(transformer);
    this.key = transformerKey;
  }

  Transformer.prototype.normalize = function normalize(transformer) {
    var _this = this;

    if ((0, _lodashLangIsFunction2["default"])(transformer)) {
      transformer = { ast: transformer };
    }

    _traversal2["default"].explode(transformer);

    (0, _lodashCollectionEach2["default"])(transformer, function (fns, type) {
      // hidden property
      if (type[0] === "_") {
        _this[type] = fns;
        return;
      }

      if (type === "enter" || type === "exit") return;

      if ((0, _lodashLangIsFunction2["default"])(fns)) fns = { enter: fns };

      if (!(0, _lodashLangIsObject2["default"])(fns)) return;

      if (!fns.enter) fns.enter = function () {};
      if (!fns.exit) fns.exit = function () {};

      transformer[type] = fns;
    });

    return transformer;
  };

  Transformer.prototype.buildPass = function buildPass(file) {
    // validate Transformer instance
    if (!(file instanceof _file2["default"])) {
      throw new TypeError(messages.get("transformerNotFile", this.key));
    }

    return new _transformerPass2["default"](file, this);
  };

  return Transformer;
})();

exports["default"] = Transformer;
module.exports = exports["default"];
},{"../../acorn":1,"../messages":46,"../traversal":156,"./file":51,"./transformer-pass":82,"lodash/collection/each":328,"lodash/lang/isFunction":406,"lodash/lang/isObject":409,"lodash/object/assign":415}],85:[function(require,module,exports){
module.exports={
  "useStrict": "strict",
  "es5.runtime": "runtime",
  "es6.runtime": "runtime"
}

},{}],86:[function(require,module,exports){
module.exports={
  "selfContained": "runtime",
  "unicode-regex": "regex.unicode",
  "spec.typeofSymbol": "es6.spec.symbols",
  "es6.symbols": "es6.spec.symbols",
  "es6.blockScopingTDZ": "es6.spec.blockScoping",

  "utility.inlineExpressions": "minification.inlineExpressions",
  "utility.deadCodeElimination": "minification.deadCodeElimination",
  "utility.removeConsoleCalls": "minification.removeConsole",
  "utility.removeDebugger": "minification.removeDebugger"
}

},{}],87:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-trailing"
};

exports.metadata = metadata;
var MemberExpression = {
  exit: function exit(node) {
    var prop = node.property;
    if (!node.computed && t.isIdentifier(prop) && !t.isValidIdentifier(prop.name)) {
      // foo.default -> foo["default"]
      node.property = t.literal(prop.name);
      node.computed = true;
    }
  }
};
exports.MemberExpression = MemberExpression;
},{"../../../types":167}],88:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-trailing"
};

exports.metadata = metadata;
var Property = {
  exit: function exit(node) {
    var key = node.key;
    if (!node.computed && t.isIdentifier(key) && !t.isValidIdentifier(key.name)) {
      // default: "bar" -> "default": "bar"
      node.key = t.literal(key.name);
    }
  }
};
exports.Property = Property;
},{"../../../types":167}],89:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ObjectExpression = ObjectExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersDefineMap = require("../../helpers/define-map");

var defineMap = _interopRequireWildcard(_helpersDefineMap);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function ObjectExpression(node, parent, scope, file) {
  var mutatorMap = {};
  var hasAny = false;

  node.properties = node.properties.filter(function (prop) {
    if (prop.kind === "get" || prop.kind === "set") {
      hasAny = true;
      defineMap.push(mutatorMap, prop, prop.kind, file);
      return false;
    } else {
      return true;
    }
  });

  if (!hasAny) return;

  return t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("defineProperties")), [node, defineMap.toDefineObject(mutatorMap)]);
}
},{"../../../types":167,"../../helpers/define-map":60}],90:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ArrowFunctionExpression = ArrowFunctionExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function ArrowFunctionExpression(node) {
  t.ensureBlock(node);

  node.expression = false;
  node.type = "FunctionExpression";
  node.shadow = true;
}
},{"../../../types":167}],91:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.VariableDeclaration = VariableDeclaration;
exports.Loop = Loop;
exports.BlockStatement = BlockStatement;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _helpersObject = require("../../../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var _lodashObjectValues = require("lodash/object/values");

var _lodashObjectValues2 = _interopRequireDefault(_lodashObjectValues);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

function isLet(node, parent) {
  if (!t.isVariableDeclaration(node)) return false;
  if (node._let) return true;
  if (node.kind !== "let") return false;

  // https://github.com/babel/babel/issues/255
  if (isLetInitable(node, parent)) {
    for (var i = 0; i < node.declarations.length; i++) {
      var declar = node.declarations[i];
      declar.init = declar.init || t.identifier("undefined");
    }
  }

  node._let = true;
  node.kind = "var";
  return true;
}

function isLetInitable(node, parent) {
  return !t.isFor(parent) || !t.isFor(parent, { left: node });
}

function isVar(node, parent) {
  return t.isVariableDeclaration(node, { kind: "var" }) && !isLet(node, parent);
}

function standardizeLets(declars) {
  var _arr = declars;

  for (var _i = 0; _i < _arr.length; _i++) {
    var declar = _arr[_i];
    delete declar._let;
  }
}

var metadata = {
  group: "builtin-advanced"
};

exports.metadata = metadata;

function VariableDeclaration(node, parent, scope, file) {
  if (!isLet(node, parent)) return;

  if (isLetInitable(node) && file.transformers["es6.spec.blockScoping"].canTransform()) {
    var nodes = [node];

    for (var i = 0; i < node.declarations.length; i++) {
      var decl = node.declarations[i];
      if (decl.init) {
        var assign = t.assignmentExpression("=", decl.id, decl.init);
        assign._ignoreBlockScopingTDZ = true;
        nodes.push(t.expressionStatement(assign));
      }
      decl.init = file.addHelper("temporal-undefined");
    }

    node._blockHoist = 2;

    return nodes;
  }
}

function Loop(node, parent, scope, file) {
  var init = node.left || node.init;
  if (isLet(init, node)) {
    t.ensureBlock(node);
    node.body._letDeclarators = [init];
  }

  var blockScoping = new BlockScoping(this, this.get("body"), parent, scope, file);
  return blockScoping.run();
}

function BlockStatement(block, parent, scope, file) {
  if (!t.isLoop(parent)) {
    var blockScoping = new BlockScoping(null, this, parent, scope, file);
    blockScoping.run();
  }
}

exports.Program = BlockStatement;

function replace(node, parent, scope, remaps) {
  if (!t.isReferencedIdentifier(node, parent)) return;

  var remap = remaps[node.name];
  if (!remap) return;

  var ownBinding = scope.getBindingIdentifier(node.name);
  if (ownBinding === remap.binding) {
    node.name = remap.uid;
  } else {
    // scope already has it's own binding that doesn't
    // match the one we have a stored replacement for
    if (this) this.skip();
  }
}

var replaceVisitor = {
  enter: replace
};

function traverseReplace(node, parent, scope, remaps) {
  replace(node, parent, scope, remaps);
  scope.traverse(node, replaceVisitor, remaps);
}

var letReferenceBlockVisitor = {
  Function: function Function(node, parent, scope, state) {
    this.traverse(letReferenceFunctionVisitor, state);
    return this.skip();
  }
};

var letReferenceFunctionVisitor = {
  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    var ref = state.letReferences[node.name];

    // not a part of our scope
    if (!ref) return;

    // this scope has a variable with the same name so it couldn't belong
    // to our let scope
    if (scope.getBindingIdentifier(node.name) !== ref) return;

    state.closurify = true;
  }
};

var hoistVarDeclarationsVisitor = {
  enter: function enter(node, parent, scope, self) {
    if (this.isForStatement()) {
      if (isVar(node.init, node)) {
        var nodes = self.pushDeclar(node.init);
        if (nodes.length === 1) {
          node.init = nodes[0];
        } else {
          node.init = t.sequenceExpression(nodes);
        }
      }
    } else if (this.isFor()) {
      if (isVar(node.left, node)) {
        node.left = node.left.declarations[0].id;
      }
    } else if (isVar(node, parent)) {
      return self.pushDeclar(node).map(t.expressionStatement);
    } else if (this.isFunction()) {
      return this.skip();
    }
  }
};

var loopLabelVisitor = {
  LabeledStatement: function LabeledStatement(node, parent, scope, state) {
    state.innerLabels.push(node.label.name);
  }
};

var continuationVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (this.isAssignmentExpression() || this.isUpdateExpression()) {
      var bindings = this.getBindingIdentifiers();
      for (var name in bindings) {
        if (state.outsideReferences[name] !== scope.getBindingIdentifier(name)) continue;
        state.reassignments[name] = true;
      }
    }
  }
};

var loopNodeTo = function loopNodeTo(node) {
  if (t.isBreakStatement(node)) {
    return "break";
  } else if (t.isContinueStatement(node)) {
    return "continue";
  }
};

var loopVisitor = {
  Loop: function Loop(node, parent, scope, state) {
    var oldIgnoreLabeless = state.ignoreLabeless;
    state.ignoreLabeless = true;
    this.traverse(loopVisitor, state);
    state.ignoreLabeless = oldIgnoreLabeless;
    this.skip();
  },

  Function: function Function() {
    this.skip();
  },

  SwitchCase: function SwitchCase(node, parent, scope, state) {
    var oldInSwitchCase = state.inSwitchCase;
    state.inSwitchCase = true;
    this.traverse(loopVisitor, state);
    state.inSwitchCase = oldInSwitchCase;
    this.skip();
  },

  enter: function enter(node, parent, scope, state) {
    var replace;
    var loopText = loopNodeTo(node);

    if (loopText) {
      if (node.label) {
        // we shouldn't be transforming this because it exists somewhere inside
        if (state.innerLabels.indexOf(node.label.name) >= 0) {
          return;
        }

        loopText = "" + loopText + "|" + node.label.name;
      } else {
        // we shouldn't be transforming these statements because
        // they don't refer to the actual loop we're scopifying
        if (state.ignoreLabeless) return;

        //
        if (state.inSwitchCase) return;

        // break statements mean something different in this context
        if (t.isBreakStatement(node) && t.isSwitchCase(parent)) return;
      }

      state.hasBreakContinue = true;
      state.map[loopText] = node;
      replace = t.literal(loopText);
    }

    if (this.isReturnStatement()) {
      state.hasReturn = true;
      replace = t.objectExpression([t.property("init", t.identifier("v"), node.argument || t.identifier("undefined"))]);
    }

    if (replace) {
      replace = t.returnStatement(replace);
      this.skip();
      return t.inherits(replace, node);
    }
  }
};

var BlockScoping = (function () {

  /**
   * Description
   */

  function BlockScoping(loopPath, blockPath, parent, scope, file) {
    _classCallCheck(this, BlockScoping);

    this.parent = parent;
    this.scope = scope;
    this.file = file;

    this.blockPath = blockPath;
    this.block = blockPath.node;

    this.outsideLetReferences = (0, _helpersObject2["default"])();
    this.hasLetReferences = false;
    this.letReferences = this.block._letReferences = (0, _helpersObject2["default"])();
    this.body = [];

    if (loopPath) {
      this.loopParent = loopPath.parent;
      this.loopLabel = t.isLabeledStatement(this.loopParent) && this.loopParent.label;
      this.loopPath = loopPath;
      this.loop = loopPath.node;
    }
  }

  /**
   * Start the ball rolling.
   */

  BlockScoping.prototype.run = function run() {
    var block = this.block;
    if (block._letDone) return;
    block._letDone = true;

    var needsClosure = this.getLetReferences();

    // this is a block within a `Function/Program` so we can safely leave it be
    if (t.isFunction(this.parent) || t.isProgram(this.block)) return;

    // we can skip everything
    if (!this.hasLetReferences) return;

    if (needsClosure) {
      this.wrapClosure();
    } else {
      this.remap();
    }

    if (this.loopLabel && !t.isLabeledStatement(this.loopParent)) {
      return t.labeledStatement(this.loopLabel, this.loop);
    }
  };

  /**
   * Description
   */

  BlockScoping.prototype.remap = function remap() {
    var hasRemaps = false;
    var letRefs = this.letReferences;
    var scope = this.scope;

    // alright, so since we aren't wrapping this block in a closure
    // we have to check if any of our let variables collide with
    // those in upper scopes and then if they do, generate a uid
    // for them and replace all references with it
    var remaps = (0, _helpersObject2["default"])();

    for (var key in letRefs) {
      // just an Identifier node we collected in `getLetReferences`
      // this is the defining identifier of a declaration
      var ref = letRefs[key];

      if (scope.parentHasBinding(key) || scope.hasGlobal(key)) {
        var uid = scope.generateUidIdentifier(ref.name).name;
        ref.name = uid;

        hasRemaps = true;
        remaps[key] = remaps[uid] = {
          binding: ref,
          uid: uid
        };
      }
    }

    if (!hasRemaps) return;

    //

    var loop = this.loop;
    if (loop) {
      traverseReplace(loop.right, loop, scope, remaps);
      traverseReplace(loop.test, loop, scope, remaps);
      traverseReplace(loop.update, loop, scope, remaps);
    }

    this.blockPath.traverse(replaceVisitor, remaps);
  };

  /**
   * Description
   */

  BlockScoping.prototype.wrapClosure = function wrapClosure() {
    var block = this.block;

    var outsideRefs = this.outsideLetReferences;

    // remap loop heads with colliding variables
    if (this.loop) {
      for (var name in outsideRefs) {
        var id = outsideRefs[name];

        if (this.scope.hasGlobal(id.name) || this.scope.parentHasBinding(id.name)) {
          delete outsideRefs[id.name];
          delete this.letReferences[id.name];

          this.scope.rename(id.name);

          this.letReferences[id.name] = id;
          outsideRefs[id.name] = id;
        }
      }
    }

    // if we're inside of a for loop then we search to see if there are any
    // `break`s, `continue`s, `return`s etc
    this.has = this.checkLoop();

    // hoist var references to retain scope
    this.hoistVarDeclarations();

    // turn outsideLetReferences into an array
    var params = (0, _lodashObjectValues2["default"])(outsideRefs);
    var args = (0, _lodashObjectValues2["default"])(outsideRefs);

    // build the closure that we're going to wrap the block with
    var fn = t.functionExpression(null, params, t.blockStatement(block.body));
    fn.shadow = true;

    // continuation
    this.addContinuations(fn);

    // replace the current block body with the one we're going to build
    block.body = this.body;

    var ref = fn;

    if (this.loop) {
      ref = this.scope.generateUidIdentifier("loop");
      this.loopPath.insertBefore(t.variableDeclaration("var", [t.variableDeclarator(ref, fn)]));
    }

    // build a call and a unique id that we can assign the return value to
    var call = t.callExpression(ref, args);
    var ret = this.scope.generateUidIdentifier("ret");

    // handle generators
    var hasYield = _traversal2["default"].hasType(fn.body, this.scope, "YieldExpression", t.FUNCTION_TYPES);
    if (hasYield) {
      fn.generator = true;
      call = t.yieldExpression(call, true);
    }

    // handlers async functions
    var hasAsync = _traversal2["default"].hasType(fn.body, this.scope, "AwaitExpression", t.FUNCTION_TYPES);
    if (hasAsync) {
      fn.async = true;
      call = t.awaitExpression(call);
    }

    this.buildClosure(ret, call);
  };

  /**
   * Push the closure to the body.
   */

  BlockScoping.prototype.buildClosure = function buildClosure(ret, call) {
    var has = this.has;
    if (has.hasReturn || has.hasBreakContinue) {
      this.buildHas(ret, call);
    } else {
      this.body.push(t.expressionStatement(call));
    }
  };

  /**
   * If any of the outer let variables are reassigned then we need to rename them in
   * the closure so we can get direct access to the outer variable to continue the
   * iteration with bindings based on each iteration.
   *
   * Reference: https://github.com/babel/babel/issues/1078
   */

  BlockScoping.prototype.addContinuations = function addContinuations(fn) {
    var state = {
      reassignments: {},
      outsideReferences: this.outsideLetReferences
    };

    this.scope.traverse(fn, continuationVisitor, state);

    for (var i = 0; i < fn.params.length; i++) {
      var param = fn.params[i];
      if (!state.reassignments[param.name]) continue;

      var newParam = this.scope.generateUidIdentifier(param.name);
      fn.params[i] = newParam;

      this.scope.rename(param.name, newParam.name, fn);

      // assign outer reference as it's been modified internally and needs to be retained
      fn.body.body.push(t.expressionStatement(t.assignmentExpression("=", param, newParam)));
    }
  };

  /**
   * Description
   */

  BlockScoping.prototype.getLetReferences = function getLetReferences() {
    var block = this.block;

    var declarators = block._letDeclarators || [];

    //
    for (var i = 0; i < declarators.length; i++) {
      var declar = declarators[i];
      (0, _lodashObjectExtend2["default"])(this.outsideLetReferences, t.getBindingIdentifiers(declar));
    }

    //
    if (block.body) {
      for (var i = 0; i < block.body.length; i++) {
        var declar = block.body[i];
        if (isLet(declar, block)) {
          declarators = declarators.concat(declar.declarations);
        }
      }
    }

    //
    for (var i = 0; i < declarators.length; i++) {
      var declar = declarators[i];
      var keys = t.getBindingIdentifiers(declar);
      (0, _lodashObjectExtend2["default"])(this.letReferences, keys);
      this.hasLetReferences = true;
    }

    // no let references so we can just quit
    if (!this.hasLetReferences) return;

    // set let references to plain var references
    standardizeLets(declarators);

    var state = {
      letReferences: this.letReferences,
      closurify: false
    };

    // traverse through this block, stopping on functions and checking if they
    // contain any local let references
    this.blockPath.traverse(letReferenceBlockVisitor, state);

    return state.closurify;
  };

  /**
   * If we're inside of a loop then traverse it and check if it has one of
   * the following node types `ReturnStatement`, `BreakStatement`,
   * `ContinueStatement` and replace it with a return value that we can track
   * later on.
   *
   * @returns {Object}
   */

  BlockScoping.prototype.checkLoop = function checkLoop() {
    var state = {
      hasBreakContinue: false,
      ignoreLabeless: false,
      inSwitchCase: false,
      innerLabels: [],
      hasReturn: false,
      isLoop: !!this.loop,
      map: {}
    };

    this.blockPath.traverse(loopLabelVisitor, state);
    this.blockPath.traverse(loopVisitor, state);

    return state;
  };

  /**
   * Hoist all var declarations in this block to before it so they retain scope
   * once we wrap everything in a closure.
   */

  BlockScoping.prototype.hoistVarDeclarations = function hoistVarDeclarations() {
    this.blockPath.traverse(hoistVarDeclarationsVisitor, this);
  };

  /**
   * Turn a `VariableDeclaration` into an array of `AssignmentExpressions` with
   * their declarations hoisted to before the closure wrapper.
   */

  BlockScoping.prototype.pushDeclar = function pushDeclar(node) {
    var declars = [];
    var names = t.getBindingIdentifiers(node);
    for (var name in names) {
      declars.push(t.variableDeclarator(names[name]));
    }

    this.body.push(t.variableDeclaration(node.kind, declars));

    var replace = [];

    for (var i = 0; i < node.declarations.length; i++) {
      var declar = node.declarations[i];
      if (!declar.init) continue;

      var expr = t.assignmentExpression("=", declar.id, declar.init);
      replace.push(t.inherits(expr, declar));
    }

    return replace;
  };

  /**
   * Description
   */

  BlockScoping.prototype.buildHas = function buildHas(ret, call) {
    var body = this.body;

    body.push(t.variableDeclaration("var", [t.variableDeclarator(ret, call)]));

    var loop = this.loop;
    var retCheck;
    var has = this.has;
    var cases = [];

    if (has.hasReturn) {
      // typeof ret === "object"
      retCheck = util.template("let-scoping-return", {
        RETURN: ret
      });
    }

    if (has.hasBreakContinue) {
      for (var key in has.map) {
        cases.push(t.switchCase(t.literal(key), [has.map[key]]));
      }

      if (has.hasReturn) {
        cases.push(t.switchCase(null, [retCheck]));
      }

      if (cases.length === 1) {
        var single = cases[0];
        body.push(this.file.attachAuxiliaryComment(t.ifStatement(t.binaryExpression("===", ret, single.test), single.consequent[0])));
      } else {
        // https://github.com/babel/babel/issues/998
        for (var i = 0; i < cases.length; i++) {
          var caseConsequent = cases[i].consequent[0];
          if (t.isBreakStatement(caseConsequent) && !caseConsequent.label) {
            caseConsequent.label = this.loopLabel = this.loopLabel || this.file.scope.generateUidIdentifier("loop");
          }
        }

        body.push(this.file.attachAuxiliaryComment(t.switchStatement(ret, cases)));
      }
    } else {
      if (has.hasReturn) {
        body.push(this.file.attachAuxiliaryComment(retCheck));
      }
    }
  };

  return BlockScoping;
})();
},{"../../../helpers/object":44,"../../../traversal":156,"../../../types":167,"../../../util":171,"lodash/object/extend":417,"lodash/object/values":422}],92:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ClassDeclaration = ClassDeclaration;
exports.ClassExpression = ClassExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _helpersMemoiseDecorators = require("../../helpers/memoise-decorators");

var _helpersMemoiseDecorators2 = _interopRequireDefault(_helpersMemoiseDecorators);

var _helpersReplaceSupers = require("../../helpers/replace-supers");

var _helpersReplaceSupers2 = _interopRequireDefault(_helpersReplaceSupers);

var _helpersNameMethod = require("../../helpers/name-method");

var nameMethod = _interopRequireWildcard(_helpersNameMethod);

var _helpersDefineMap = require("../../helpers/define-map");

var defineMap = _interopRequireWildcard(_helpersDefineMap);

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashObjectHas = require("lodash/object/has");

var _lodashObjectHas2 = _interopRequireDefault(_lodashObjectHas);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var PROPERTY_COLLISION_METHOD_NAME = "__initializeProperties";

function ClassDeclaration(node, parent, scope, file) {
  return t.variableDeclaration("let", [t.variableDeclarator(node.id, t.toExpression(node))]);
}

function ClassExpression(node, parent, scope, file) {
  return new ClassTransformer(this, file).run();
}

var collectPropertyReferencesVisitor = {
  Identifier: {
    enter: function enter(node, parent, scope, state) {
      if (this.parentPath.isClassProperty({ key: node })) {
        return;
      }

      if (this.isReferenced() && scope.getBinding(node.name) === state.scope.getBinding(node.name)) {
        state.references[node.name] = true;
      }
    }
  }
};

var constructorVisitor = {
  ThisExpression: {
    enter: function enter(node, parent, scope, ref) {
      return ref;
    }
  },

  Function: {
    enter: function enter(node) {
      if (!node.shadow) {
        this.skip();
      }
    }
  }
};

var verifyConstructorVisitor = {
  MethodDefinition: {
    enter: function enter() {
      this.skip();
    }
  },

  Property: {
    enter: function enter(node) {
      if (node.method) this.skip();
    }
  },

  CallExpression: {
    exit: function exit(node, parent, scope, state) {
      if (this.get("callee").isSuper()) {
        state.hasBareSuper = true;
        state.bareSuper = this;

        if (!state.hasSuper) {
          throw this.errorWithNode("super call is only allowed in derived constructor");
        }
      }
    }
  },

  FunctionDeclaration: {
    enter: function enter() {
      this.skip();
    }
  },

  FunctionExpression: {
    enter: function enter() {
      this.skip();
    }
  },

  ThisExpression: {
    enter: function enter(node, parent, scope, state) {
      if (state.hasSuper && !state.hasBareSuper) {
        throw this.errorWithNode("'this' is not allowed before super()");
      }
    }
  }
};

var ClassTransformer = (function () {

  /**
   * Description
   */

  function ClassTransformer(path, file) {
    _classCallCheck(this, ClassTransformer);

    this.parent = path.parent;
    this.scope = path.scope;
    this.node = path.node;
    this.path = path;
    this.file = file;

    this.hasInstanceDescriptors = false;
    this.hasStaticDescriptors = false;

    this.instanceMutatorMap = {};
    this.staticMutatorMap = {};

    this.instancePropBody = [];
    this.instancePropRefs = {};
    this.staticPropBody = [];
    this.body = [];

    this.hasConstructor = false;
    this.hasDecorators = false;
    this.className = this.node.id;
    this.classRef = this.node.id || this.scope.generateUidIdentifier("class");

    this.superName = this.node.superClass || t.identifier("Function");
    this.hasSuper = !!this.node.superClass;

    this.isLoose = file.isLoose("es6.classes");
  }

  /**
   * Description
   *
   * @returns {Array}
   */

  ClassTransformer.prototype.run = function run() {
    var superName = this.superName;
    var className = this.className;
    var classBody = this.node.body.body;
    var classRef = this.classRef;
    var file = this.file;

    //

    var body = this.body;

    //

    var constructorBody = this.constructorBody = t.blockStatement([]);
    var constructor;

    if (this.className) {
      constructor = t.functionDeclaration(this.className, [], constructorBody);
      body.push(constructor);
    } else {
      constructor = t.functionExpression(null, [], constructorBody);
    }

    this.constructor = constructor;

    //

    var closureParams = [];
    var closureArgs = [];

    //
    if (this.hasSuper) {
      closureArgs.push(superName);

      superName = this.scope.generateUidBasedOnNode(superName);
      closureParams.push(superName);

      this.superName = superName;
      body.push(t.expressionStatement(t.callExpression(file.addHelper("inherits"), [classRef, superName])));
    }

    //
    var decorators = this.node.decorators;
    if (decorators) {
      // create a class reference to use later on
      this.classRef = this.scope.generateUidIdentifier(classRef);

      // this is so super calls and the decorators have access to the raw function
      body.push(t.variableDeclaration("var", [t.variableDeclarator(this.classRef, classRef)]));
    }

    //
    this.buildBody();

    // make sure this class isn't directly called
    constructorBody.body.unshift(t.expressionStatement(t.callExpression(file.addHelper("class-call-check"), [t.thisExpression(), this.classRef])));

    //

    if (decorators) {
      // reverse the decorators so we execute them in the right order
      decorators = decorators.reverse();

      for (var i = 0; i < decorators.length; i++) {
        var decorator = decorators[i];

        var decoratorNode = util.template("class-decorator", {
          DECORATOR: decorator.expression,
          CLASS_REF: classRef
        }, true);
        decoratorNode.expression._ignoreModulesRemap = true;
        body.push(decoratorNode);
      }
    }

    if (this.className) {
      // named class with only a constructor
      if (body.length === 1) return t.toExpression(body[0]);
    } else {
      // infer class name if this is a nameless class expression
      constructor = nameMethod.bare(constructor, this.parent, this.scope) || constructor;

      body.unshift(t.variableDeclaration("var", [t.variableDeclarator(classRef, constructor)]));

      t.inheritsComments(body[0], this.node);
    }

    body = body.concat(this.staticPropBody);

    //

    body.push(t.returnStatement(classRef));

    return t.callExpression(t.functionExpression(null, closureParams, t.blockStatement(body)), closureArgs);
  };

  /**
   * Description
   */

  ClassTransformer.prototype.pushToMap = function pushToMap(node, enumerable) {
    var kind = arguments[2] === undefined ? "value" : arguments[2];

    var mutatorMap;
    if (node["static"]) {
      this.hasStaticDescriptors = true;
      mutatorMap = this.staticMutatorMap;
    } else {
      this.hasInstanceDescriptors = true;
      mutatorMap = this.instanceMutatorMap;
    }

    var map = defineMap.push(mutatorMap, node, kind, this.file);

    if (enumerable) {
      map.enumerable = t.literal(true);
    }

    if (map.decorators) {
      this.hasDecorators = true;
    }
  };

  /**
   * Description
   */

  ClassTransformer.prototype.buildBody = function buildBody() {
    var constructorBody = this.constructorBody;
    var constructor = this.constructor;
    var className = this.className;
    var superName = this.superName;
    var classBody = this.node.body.body;
    var body = this.body;

    var classBodyPaths = this.path.get("body").get("body");

    for (var i = 0; i < classBody.length; i++) {
      var node = classBody[i];
      var path = classBodyPaths[i];

      if (node.decorators) {
        (0, _helpersMemoiseDecorators2["default"])(node.decorators, this.scope);
      }

      if (t.isMethodDefinition(node)) {
        var isConstructor = node.kind === "constructor";
        if (isConstructor) this.verifyConstructor(path);

        var replaceSupers = new _helpersReplaceSupers2["default"]({
          methodPath: path,
          methodNode: node,
          objectRef: this.classRef,
          superRef: this.superName,
          isStatic: node["static"],
          isLoose: this.isLoose,
          scope: this.scope,
          file: this.file
        }, true);

        replaceSupers.replace();

        if (isConstructor) {
          this.pushConstructor(node, path);
        } else {
          this.pushMethod(node, path);
        }
      } else if (t.isClassProperty(node)) {
        this.pushProperty(node);
      }
    }

    // we have no constructor, but we're a derived class
    if (!this.hasConstructor && this.hasSuper) {
      var helperName = "class-super-constructor-call";
      if (this.isLoose) helperName += "-loose";
      constructorBody.body.push(util.template(helperName, {
        CLASS_NAME: this.classRef,
        SUPER_NAME: this.superName
      }, true));
    }

    //
    this.placePropertyInitializers();

    //
    if (this.userConstructor) {
      constructorBody.body = constructorBody.body.concat(this.userConstructor.body.body);
      t.inherits(this.constructor, this.userConstructor);
      t.inherits(this.constructorBody, this.userConstructor.body);
    }

    var instanceProps;
    var staticProps;
    var classHelper = "create-class";
    if (this.hasDecorators) classHelper = "create-decorated-class";

    if (this.hasInstanceDescriptors) {
      instanceProps = defineMap.toClassObject(this.instanceMutatorMap);
    }

    if (this.hasStaticDescriptors) {
      staticProps = defineMap.toClassObject(this.staticMutatorMap);
    }

    if (instanceProps || staticProps) {
      if (instanceProps) instanceProps = defineMap.toComputedObjectFromClass(instanceProps);
      if (staticProps) staticProps = defineMap.toComputedObjectFromClass(staticProps);

      var nullNode = t.literal(null);

      // (Constructor, instanceDescriptors, staticDescriptors, instanceInitializers, staticInitializers)
      var args = [this.classRef, nullNode, nullNode, nullNode, nullNode];

      if (instanceProps) args[1] = instanceProps;
      if (staticProps) args[2] = staticProps;

      if (this.instanceInitializersId) {
        args[3] = this.instanceInitializersId;
        body.unshift(this.buildObjectAssignment(this.instanceInitializersId));
      }

      if (this.staticInitializersId) {
        args[4] = this.staticInitializersId;
        body.unshift(this.buildObjectAssignment(this.staticInitializersId));
      }

      var lastNonNullIndex = 0;
      for (var i = 0; i < args.length; i++) {
        if (args[i] !== nullNode) lastNonNullIndex = i;
      }
      args = args.slice(0, lastNonNullIndex + 1);

      body.push(t.expressionStatement(t.callExpression(this.file.addHelper(classHelper), args)));
    }
  };

  ClassTransformer.prototype.buildObjectAssignment = function buildObjectAssignment(id) {
    return t.variableDeclaration("var", [t.variableDeclarator(id, t.objectExpression([]))]);
  };

  /**
   * Description
   */

  ClassTransformer.prototype.placePropertyInitializers = function placePropertyInitializers() {
    var body = this.instancePropBody;
    if (!body.length) return;

    if (this.hasPropertyCollision()) {
      var call = t.expressionStatement(t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(PROPERTY_COLLISION_METHOD_NAME)), []));

      this.pushMethod(t.methodDefinition(t.identifier(PROPERTY_COLLISION_METHOD_NAME), t.functionExpression(null, [], t.blockStatement(body))), null, true);

      if (this.hasSuper) {
        this.bareSuper.insertAfter(call);
      } else {
        this.constructorBody.body.unshift(call);
      }
    } else {
      if (this.hasSuper) {
        if (this.hasConstructor) {
          this.bareSuper.insertAfter(body);
        } else {
          this.constructorBody.body = this.constructorBody.body.concat(body);
        }
      } else {
        this.constructorBody.body = body.concat(this.constructorBody.body);
      }
    }
  };

  /**
   * Description
   */

  ClassTransformer.prototype.hasPropertyCollision = function hasPropertyCollision() {
    if (this.userConstructorPath) {
      for (var name in this.instancePropRefs) {
        if (this.userConstructorPath.scope.hasOwnBinding(name)) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Description
   */

  ClassTransformer.prototype.verifyConstructor = function verifyConstructor(path) {
    var state = {
      hasBareSuper: false,
      bareSuper: null,
      hasSuper: this.hasSuper,
      file: this.file
    };

    path.get("value").traverse(verifyConstructorVisitor, state);

    this.bareSuper = state.bareSuper;

    if (!state.hasBareSuper && this.hasSuper) {
      throw path.errorWithNode("Derived constructor must call super()");
    }
  };

  /**
   * Push a method to its respective mutatorMap.
   */

  ClassTransformer.prototype.pushMethod = function pushMethod(node, path, allowedIllegal) {
    if (!allowedIllegal && t.isLiteral(t.toComputedKey(node), { value: PROPERTY_COLLISION_METHOD_NAME })) {
      throw this.file.errorWithNode(node, messages.get("illegalMethodName", PROPERTY_COLLISION_METHOD_NAME));
    }

    if (node.kind === "method") {
      nameMethod.property(node, this.file, path ? path.get("value").scope : this.scope);

      if (this.isLoose && !node.decorators) {
        // use assignments instead of define properties for loose classes

        var classRef = this.classRef;
        if (!node["static"]) classRef = t.memberExpression(classRef, t.identifier("prototype"));
        var methodName = t.memberExpression(classRef, node.key, node.computed);

        var expr = t.expressionStatement(t.assignmentExpression("=", methodName, node.value));
        t.inheritsComments(expr, node);
        this.body.push(expr);
        return;
      }
    }

    this.pushToMap(node);
  };

  /**
   * Description
   */

  ClassTransformer.prototype.pushProperty = function pushProperty(node) {
    var key;

    this.scope.traverse(node, collectPropertyReferencesVisitor, {
      references: this.instancePropRefs,
      scope: this.scope
    });

    if (node.decorators) {
      var body = [];
      if (node.value) {
        body.push(t.returnStatement(node.value));
        node.value = t.functionExpression(null, [], t.blockStatement(body));
      } else {
        node.value = t.literal(null);
      }
      this.pushToMap(node, true, "initializer");

      var initializers;
      var body;
      var target;
      if (node["static"]) {
        initializers = this.staticInitializersId = this.staticInitializersId || this.scope.generateUidIdentifier("staticInitializers");
        body = this.staticPropBody;
        target = this.classRef;
      } else {
        initializers = this.instanceInitializersId = this.instanceInitializersId || this.scope.generateUidIdentifier("instanceInitializers");
        body = this.instancePropBody;
        target = t.thisExpression();
      }

      body.push(t.expressionStatement(t.callExpression(this.file.addHelper("define-decorated-property-descriptor"), [target, t.literal(node.key.name), initializers])));
    } else {
      if (!node.value && !node.decorators) return;

      if (node["static"]) {
        // can just be added to the static map
        this.pushToMap(node, true);
      } else if (node.value) {
        // add this to the instancePropBody which will be added after the super call in a derived constructor
        // or at the start of a constructor for a non-derived constructor
        this.instancePropBody.push(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.thisExpression(), node.key), node.value)));
      }
    }
  };

  /**
   * Replace the constructor body of our class.
   */

  ClassTransformer.prototype.pushConstructor = function pushConstructor(method, path) {
    // https://github.com/babel/babel/issues/1077
    var fnPath = path.get("value");
    if (fnPath.scope.hasOwnBinding(this.classRef.name)) {
      fnPath.scope.rename(this.classRef.name);
    }

    var construct = this.constructor;
    var fn = method.value;

    this.userConstructorPath = fnPath;
    this.userConstructor = fn;
    this.hasConstructor = true;

    t.inheritsComments(construct, method);

    construct._ignoreUserWhitespace = true;
    construct.params = fn.params;

    t.inherits(construct.body, fn.body);
  };

  return ClassTransformer;
})();
},{"../../../messages":46,"../../../traversal":156,"../../../types":167,"../../../util":171,"../../helpers/define-map":60,"../../helpers/memoise-decorators":63,"../../helpers/name-method":64,"../../helpers/replace-supers":68,"lodash/collection/each":328,"lodash/object/has":418}],93:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.AssignmentExpression = AssignmentExpression;
exports.VariableDeclaration = VariableDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function AssignmentExpression(node, parent, scope, file) {
  var ids = this.getBindingIdentifiers();

  for (var name in ids) {
    var id = ids[name];

    var binding = scope.getBinding(name);

    // no binding exists
    if (!binding) continue;

    // not a constant
    if (binding.kind !== "const" && binding.kind !== "module") continue;

    // check if the assignment id matches the constant declaration id
    // if it does then it was the id used to initially declare the
    // constant so we can just ignore it
    if (binding.identifier === id) continue;

    throw file.errorWithNode(id, messages.get("readOnly", name));
  }
}

exports.UpdateExpression = AssignmentExpression;

function VariableDeclaration(node) {
  if (node.kind === "const") node.kind = "let";
}
},{"../../../messages":46,"../../../types":167}],94:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ForOfStatement = ForOfStatement;
exports.Func = Func;
exports.CatchClause = CatchClause;
exports.ExpressionStatement = ExpressionStatement;
exports.AssignmentExpression = AssignmentExpression;
exports.VariableDeclaration = VariableDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-advanced"
};

exports.metadata = metadata;

function ForOfStatement(node, parent, scope, file) {
  var left = node.left;

  if (t.isPattern(left)) {
    // for ({ length: k } in { abc: 3 });

    var temp = scope.generateUidIdentifier("ref");

    node.left = t.variableDeclaration("var", [t.variableDeclarator(temp)]);

    t.ensureBlock(node);

    node.body.body.unshift(t.variableDeclaration("var", [t.variableDeclarator(left, temp)]));

    return;
  }

  if (!t.isVariableDeclaration(left)) return;

  var pattern = left.declarations[0].id;
  if (!t.isPattern(pattern)) return;

  var key = scope.generateUidIdentifier("ref");
  node.left = t.variableDeclaration(left.kind, [t.variableDeclarator(key, null)]);

  var nodes = [];

  var destructuring = new DestructuringTransformer({
    kind: left.kind,
    file: file,
    scope: scope,
    nodes: nodes
  });

  destructuring.init(pattern, key);

  t.ensureBlock(node);

  var block = node.body;
  block.body = nodes.concat(block.body);
}

exports.ForInStatement = ForOfStatement;

function Func(node, parent, scope, file) {
  var nodes = [];

  var hasDestructuring = false;

  node.params = node.params.map(function (pattern, i) {
    if (!t.isPattern(pattern)) return pattern;

    hasDestructuring = true;
    var ref = scope.generateUidIdentifier("ref");
    t.inherits(ref, pattern);

    var destructuring = new DestructuringTransformer({
      blockHoist: node.params.length - i,
      nodes: nodes,
      scope: scope,
      file: file,
      kind: "let"
    });
    destructuring.init(pattern, ref);

    return ref;
  });

  if (!hasDestructuring) return;

  t.ensureBlock(node);

  var block = node.body;
  block.body = nodes.concat(block.body);
}

function CatchClause(node, parent, scope, file) {
  var pattern = node.param;
  if (!t.isPattern(pattern)) return;

  var ref = scope.generateUidIdentifier("ref");
  node.param = ref;

  var nodes = [];

  var destructuring = new DestructuringTransformer({
    kind: "let",
    file: file,
    scope: scope,
    nodes: nodes
  });
  destructuring.init(pattern, ref);

  node.body.body = nodes.concat(node.body.body);
}

function ExpressionStatement(node, parent, scope, file) {
  var expr = node.expression;
  if (expr.type !== "AssignmentExpression") return;
  if (!t.isPattern(expr.left)) return;
  if (this.isCompletionRecord()) return;

  var destructuring = new DestructuringTransformer({
    operator: expr.operator,
    scope: scope,
    file: file });

  return destructuring.init(expr.left, expr.right);
}

function AssignmentExpression(node, parent, scope, file) {
  if (!t.isPattern(node.left)) return;

  var ref = scope.generateUidIdentifier("temp");

  var nodes = [];
  nodes.push(t.variableDeclaration("var", [t.variableDeclarator(ref, node.right)]));

  var destructuring = new DestructuringTransformer({
    operator: node.operator,
    file: file,
    scope: scope,
    nodes: nodes
  });

  if (t.isArrayExpression(node.right)) {
    destructuring.arrays[ref.name] = true;
  }

  destructuring.init(node.left, ref);

  nodes.push(t.expressionStatement(ref));

  return nodes;
}

function variableDeclarationHasPattern(node) {
  for (var i = 0; i < node.declarations.length; i++) {
    if (t.isPattern(node.declarations[i].id)) {
      return true;
    }
  }
  return false;
}

function VariableDeclaration(node, parent, scope, file) {
  if (t.isForInStatement(parent) || t.isForOfStatement(parent)) return;
  if (!variableDeclarationHasPattern(node)) return;

  var nodes = [];
  var declar;

  for (var i = 0; i < node.declarations.length; i++) {
    declar = node.declarations[i];

    var patternId = declar.init;
    var pattern = declar.id;

    var destructuring = new DestructuringTransformer({
      nodes: nodes,
      scope: scope,
      kind: node.kind,
      file: file
    });

    if (t.isPattern(pattern)) {
      destructuring.init(pattern, patternId);

      if (+i !== node.declarations.length - 1) {
        // we aren't the last declarator so let's just make the
        // last transformed node inherit from us
        t.inherits(nodes[nodes.length - 1], declar);
      }
    } else {
      nodes.push(t.inherits(destructuring.buildVariableAssignment(declar.id, declar.init), declar));
    }
  }

  if (!t.isProgram(parent) && !t.isBlockStatement(parent)) {
    // https://github.com/babel/babel/issues/113
    // for (let [x] = [0]; false;) {}

    declar = null;

    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      declar = declar || t.variableDeclaration(node.kind, []);

      if (!t.isVariableDeclaration(node) && declar.kind !== node.kind) {
        throw file.errorWithNode(node, messages.get("invalidParentForThisNode"));
      }

      declar.declarations = declar.declarations.concat(node.declarations);
    }

    return declar;
  }

  return nodes;
}

function hasRest(pattern) {
  for (var i = 0; i < pattern.elements.length; i++) {
    if (t.isRestElement(pattern.elements[i])) {
      return true;
    }
  }
  return false;
}

var arrayUnpackVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (this.isReferencedIdentifier() && state.bindings[node.name]) {
      state.deopt = true;
      this.stop();
    }
  }
};

var DestructuringTransformer = (function () {
  function DestructuringTransformer(opts) {
    _classCallCheck(this, DestructuringTransformer);

    this.blockHoist = opts.blockHoist;
    this.operator = opts.operator;
    this.arrays = {};
    this.nodes = opts.nodes || [];
    this.scope = opts.scope;
    this.file = opts.file;
    this.kind = opts.kind;
  }

  DestructuringTransformer.prototype.buildVariableAssignment = function buildVariableAssignment(id, init) {
    var op = this.operator;
    if (t.isMemberExpression(id)) op = "=";

    var node;

    if (op) {
      node = t.expressionStatement(t.assignmentExpression(op, id, init));
    } else {
      node = t.variableDeclaration(this.kind, [t.variableDeclarator(id, init)]);
    }

    node._blockHoist = this.blockHoist;

    return node;
  };

  DestructuringTransformer.prototype.buildVariableDeclaration = function buildVariableDeclaration(id, init) {
    var declar = t.variableDeclaration("var", [t.variableDeclarator(id, init)]);
    declar._blockHoist = this.blockHoist;
    return declar;
  };

  DestructuringTransformer.prototype.push = function push(id, init) {
    if (t.isObjectPattern(id)) {
      this.pushObjectPattern(id, init);
    } else if (t.isArrayPattern(id)) {
      this.pushArrayPattern(id, init);
    } else if (t.isAssignmentPattern(id)) {
      this.pushAssignmentPattern(id, init);
    } else {
      this.nodes.push(this.buildVariableAssignment(id, init));
    }
  };

  DestructuringTransformer.prototype.toArray = function toArray(node, count) {
    if (this.file.isLoose("es6.destructuring") || t.isIdentifier(node) && this.arrays[node.name]) {
      return node;
    } else {
      return this.scope.toArray(node, count);
    }
  };

  DestructuringTransformer.prototype.pushAssignmentPattern = function pushAssignmentPattern(pattern, valueRef) {
    // we need to assign the current value of the assignment to avoid evaluating
    // it more than once

    var tempValueRef = this.scope.generateUidBasedOnNode(valueRef);

    var declar = t.variableDeclaration("var", [t.variableDeclarator(tempValueRef, valueRef)]);
    declar._blockHoist = this.blockHoist;
    this.nodes.push(declar);

    //

    var tempConditional = t.conditionalExpression(t.binaryExpression("===", tempValueRef, t.identifier("undefined")), pattern.right, tempValueRef);

    var left = pattern.left;
    if (t.isPattern(left)) {
      this.nodes.push(t.expressionStatement(t.assignmentExpression("=", tempValueRef, tempConditional)));
      this.push(left, tempValueRef);
    } else {
      this.nodes.push(this.buildVariableAssignment(left, tempConditional));
    }
  };

  DestructuringTransformer.prototype.pushObjectSpread = function pushObjectSpread(pattern, objRef, spreadProp, spreadPropIndex) {
    // get all the keys that appear in this object before the current spread

    var keys = [];

    for (var i = 0; i < pattern.properties.length; i++) {
      var prop = pattern.properties[i];

      // we've exceeded the index of the spread property to all properties to the
      // right need to be ignored
      if (i >= spreadPropIndex) break;

      // ignore other spread properties
      if (t.isSpreadProperty(prop)) continue;

      var key = prop.key;
      if (t.isIdentifier(key) && !prop.computed) key = t.literal(prop.key.name);
      keys.push(key);
    }

    keys = t.arrayExpression(keys);

    //

    var value = t.callExpression(this.file.addHelper("object-without-properties"), [objRef, keys]);
    this.nodes.push(this.buildVariableAssignment(spreadProp.argument, value));
  };

  DestructuringTransformer.prototype.pushObjectProperty = function pushObjectProperty(prop, propRef) {
    if (t.isLiteral(prop.key)) prop.computed = true;

    var pattern = prop.value;
    var objRef = t.memberExpression(propRef, prop.key, prop.computed);

    if (t.isPattern(pattern)) {
      this.push(pattern, objRef);
    } else {
      this.nodes.push(this.buildVariableAssignment(pattern, objRef));
    }
  };

  DestructuringTransformer.prototype.pushObjectPattern = function pushObjectPattern(pattern, objRef) {
    // https://github.com/babel/babel/issues/681

    if (!pattern.properties.length) {
      this.nodes.push(t.expressionStatement(t.callExpression(this.file.addHelper("object-destructuring-empty"), [objRef])));
    }

    // if we have more than one properties in this pattern and the objectRef is a
    // member expression then we need to assign it to a temporary variable so it's
    // only evaluated once

    if (pattern.properties.length > 1 && t.isMemberExpression(objRef)) {
      var temp = this.scope.generateUidBasedOnNode(objRef, this.file);
      this.nodes.push(this.buildVariableDeclaration(temp, objRef));
      objRef = temp;
    }

    //

    for (var i = 0; i < pattern.properties.length; i++) {
      var prop = pattern.properties[i];
      if (t.isSpreadProperty(prop)) {
        this.pushObjectSpread(pattern, objRef, prop, i);
      } else {
        this.pushObjectProperty(prop, objRef);
      }
    }
  };

  DestructuringTransformer.prototype.canUnpackArrayPattern = function canUnpackArrayPattern(pattern, arr) {
    // not an array so there's no way we can deal with this
    if (!t.isArrayExpression(arr)) return false;

    // pattern has less elements than the array and doesn't have a rest so some
    // elements wont be evaluated
    if (pattern.elements.length > arr.elements.length) return;
    if (pattern.elements.length < arr.elements.length && !hasRest(pattern)) return false;

    for (var i = 0; i < pattern.elements.length; i++) {
      var elem = pattern.elements[i];

      // deopt on holes
      if (!elem) return false;

      // deopt on member expressions
      if (t.isMemberExpression(elem)) return false;
    }

    // deopt on reference to left side identifiers
    var bindings = t.getBindingIdentifiers(pattern);
    var state = { deopt: false, bindings: bindings };
    this.scope.traverse(arr, arrayUnpackVisitor, state);
    return !state.deopt;
  };

  DestructuringTransformer.prototype.pushUnpackedArrayPattern = function pushUnpackedArrayPattern(pattern, arr) {
    for (var i = 0; i < pattern.elements.length; i++) {
      var elem = pattern.elements[i];
      if (t.isRestElement(elem)) {
        this.push(elem.argument, t.arrayExpression(arr.elements.slice(i)));
      } else {
        this.push(elem, arr.elements[i]);
      }
    }
  };

  DestructuringTransformer.prototype.pushArrayPattern = function pushArrayPattern(pattern, arrayRef) {
    if (!pattern.elements) return;

    // optimise basic array destructuring of an array expression
    //
    // we can't do this to a pattern of unequal size to it's right hand
    // array expression as then there will be values that wont be evaluated
    //
    // eg: var [a, b] = [1, 2];

    if (this.canUnpackArrayPattern(pattern, arrayRef)) {
      return this.pushUnpackedArrayPattern(pattern, arrayRef);
    }

    // if we have a rest then we need all the elements so don't tell
    // `scope.toArray` to only get a certain amount

    var count = !hasRest(pattern) && pattern.elements.length;

    // so we need to ensure that the `arrayRef` is an array, `scope.toArray` will
    // return a locally bound identifier if it's been inferred to be an array,
    // otherwise it'll be a call to a helper that will ensure it's one

    var toArray = this.toArray(arrayRef, count);

    if (t.isIdentifier(toArray)) {
      // we've been given an identifier so it must have been inferred to be an
      // array
      arrayRef = toArray;
    } else {
      arrayRef = this.scope.generateUidBasedOnNode(arrayRef);
      this.arrays[arrayRef.name] = true;
      this.nodes.push(this.buildVariableDeclaration(arrayRef, toArray));
    }

    //

    for (var i = 0; i < pattern.elements.length; i++) {
      var elem = pattern.elements[i];

      // hole
      if (!elem) continue;

      var elemRef;

      if (t.isRestElement(elem)) {
        elemRef = this.toArray(arrayRef);

        if (i > 0) {
          elemRef = t.callExpression(t.memberExpression(elemRef, t.identifier("slice")), [t.literal(i)]);
        }

        // set the element to the rest element argument since we've dealt with it
        // being a rest already
        elem = elem.argument;
      } else {
        elemRef = t.memberExpression(arrayRef, t.literal(i), true);
      }

      this.push(elem, elemRef);
    }
  };

  DestructuringTransformer.prototype.init = function init(pattern, ref) {
    // trying to destructure a value that we can't evaluate more than once so we
    // need to save it to a variable

    var shouldMemoise = true;
    if (!t.isArrayExpression(ref) && !t.isMemberExpression(ref)) {
      var memo = this.scope.generateMemoisedReference(ref, true);
      if (memo) {
        this.nodes.push(this.buildVariableDeclaration(memo, ref));
        ref = memo;
      }
    }

    //

    this.push(pattern, ref);

    return this.nodes;
  };

  return DestructuringTransformer;
})();
},{"../../../messages":46,"../../../types":167}],95:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ForOfStatement = ForOfStatement;
exports._ForOfStatementArray = _ForOfStatementArray;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function ForOfStatement(node, parent, scope, file) {
  if (this.get("right").isArrayExpression()) {
    return _ForOfStatementArray.call(this, node, scope, file);
  }

  var callback = spec;
  if (file.isLoose("es6.forOf")) callback = loose;

  var build = callback(node, parent, scope, file);
  var declar = build.declar;
  var loop = build.loop;
  var block = loop.body;

  // ensure that it's a block so we can take all its statements
  t.ensureBlock(node);

  // add the value declaration to the new loop body
  if (declar) {
    block.body.push(declar);
  }

  // push the rest of the original loop body onto our new body
  block.body = block.body.concat(node.body.body);

  t.inherits(loop, node);
  t.inherits(loop.body, node.body);

  if (build.replaceParent) {
    this.parentPath.replaceWithMultiple(build.node);
    this.remove();
  } else {
    this.replaceWithMultiple(build.node);
  }
}

function _ForOfStatementArray(node, scope, file) {
  var nodes = [];
  var right = node.right;

  if (!t.isIdentifier(right) || !scope.hasBinding(right.name)) {
    var uid = scope.generateUidIdentifier("arr");
    nodes.push(t.variableDeclaration("var", [t.variableDeclarator(uid, right)]));
    right = uid;
  }

  var iterationKey = scope.generateUidIdentifier("i");

  var loop = util.template("for-of-array", {
    BODY: node.body,
    KEY: iterationKey,
    ARR: right
  });

  t.inherits(loop, node);
  t.ensureBlock(loop);

  var iterationValue = t.memberExpression(right, iterationKey, true);

  var left = node.left;
  if (t.isVariableDeclaration(left)) {
    left.declarations[0].init = iterationValue;
    loop.body.body.unshift(left);
  } else {
    loop.body.body.unshift(t.expressionStatement(t.assignmentExpression("=", left, iterationValue)));
  }

  nodes.push(loop);

  return nodes;
}

var loose = function loose(node, parent, scope, file) {
  var left = node.left;
  var declar, id;

  if (t.isIdentifier(left) || t.isPattern(left) || t.isMemberExpression(left)) {
    // for (i of test), for ({ i } of test)
    id = left;
  } else if (t.isVariableDeclaration(left)) {
    // for (var i of test)
    id = scope.generateUidIdentifier("ref");
    declar = t.variableDeclaration(left.kind, [t.variableDeclarator(left.declarations[0].id, id)]);
  } else {
    throw file.errorWithNode(left, messages.get("unknownForHead", left.type));
  }

  var iteratorKey = scope.generateUidIdentifier("iterator");
  var isArrayKey = scope.generateUidIdentifier("isArray");

  var loop = util.template("for-of-loose", {
    LOOP_OBJECT: iteratorKey,
    IS_ARRAY: isArrayKey,
    OBJECT: node.right,
    INDEX: scope.generateUidIdentifier("i"),
    ID: id
  });

  if (!declar) {
    // no declaration so we need to remove the variable declaration at the top of
    // the for-of-loose template
    loop.body.body.shift();
  }

  //

  return {
    declar: declar,
    node: loop,
    loop: loop
  };
};

var spec = function spec(node, parent, scope, file) {
  var left = node.left;
  var declar;

  var stepKey = scope.generateUidIdentifier("step");
  var stepValue = t.memberExpression(stepKey, t.identifier("value"));

  if (t.isIdentifier(left) || t.isPattern(left) || t.isMemberExpression(left)) {
    // for (i of test), for ({ i } of test)
    declar = t.expressionStatement(t.assignmentExpression("=", left, stepValue));
  } else if (t.isVariableDeclaration(left)) {
    // for (var i of test)
    declar = t.variableDeclaration(left.kind, [t.variableDeclarator(left.declarations[0].id, stepValue)]);
  } else {
    throw file.errorWithNode(left, messages.get("unknownForHead", left.type));
  }

  //

  var iteratorKey = scope.generateUidIdentifier("iterator");

  var template = util.template("for-of", {
    ITERATOR_HAD_ERROR_KEY: scope.generateUidIdentifier("didIteratorError"),
    ITERATOR_COMPLETION: scope.generateUidIdentifier("iteratorNormalCompletion"),
    ITERATOR_ERROR_KEY: scope.generateUidIdentifier("iteratorError"),
    ITERATOR_KEY: iteratorKey,
    STEP_KEY: stepKey,
    OBJECT: node.right,
    BODY: null
  });

  var isLabeledParent = t.isLabeledStatement(parent);

  var tryBody = template[3].block.body;
  var loop = tryBody[0];

  if (isLabeledParent) {
    tryBody[0] = t.labeledStatement(parent.label, loop);
  }

  //

  return {
    replaceParent: isLabeledParent,
    declar: declar,
    loop: loop,
    node: template
  };
};
},{"../../../messages":46,"../../../types":167,"../../../util":171}],96:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ImportDeclaration = ImportDeclaration;
exports.ExportAllDeclaration = ExportAllDeclaration;
exports.ExportDefaultDeclaration = ExportDefaultDeclaration;
exports.ExportNamedDeclaration = ExportNamedDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function keepBlockHoist(node, nodes) {
  if (node._blockHoist) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i]._blockHoist = node._blockHoist;
    }
  }
}

var metadata = {
  group: "builtin-modules"
};

exports.metadata = metadata;

function ImportDeclaration(node, parent, scope, file) {
  // flow type
  if (node.isType) return;

  var nodes = [];

  if (node.specifiers.length) {
    for (var i = 0; i < node.specifiers.length; i++) {
      file.moduleFormatter.importSpecifier(node.specifiers[i], node, nodes, parent);
    }
  } else {
    file.moduleFormatter.importDeclaration(node, nodes, parent);
  }

  if (nodes.length === 1) {
    // inherit `_blockHoist` - this is for `_blockHoist` in File.prototype.addImport
    nodes[0]._blockHoist = node._blockHoist;
  }

  return nodes;
}

function ExportAllDeclaration(node, parent, scope, file) {
  var nodes = [];
  file.moduleFormatter.exportAllDeclaration(node, nodes, parent);
  keepBlockHoist(node, nodes);
  return nodes;
}

function ExportDefaultDeclaration(node, parent, scope, file) {
  var nodes = [];
  file.moduleFormatter.exportDeclaration(node, nodes, parent);
  keepBlockHoist(node, nodes);
  return nodes;
}

function ExportNamedDeclaration(node, parent, scope, file) {
  // flow type
  if (this.get("declaration").isTypeAlias()) return;

  var nodes = [];

  if (node.declaration) {
    // make sure variable exports have an initializer
    // this is done here to avoid duplicating it in the module formatters
    if (t.isVariableDeclaration(node.declaration)) {
      var declar = node.declaration.declarations[0];
      declar.init = declar.init || t.identifier("undefined");
    }

    file.moduleFormatter.exportDeclaration(node, nodes, parent);
  } else if (node.specifiers) {
    for (var i = 0; i < node.specifiers.length; i++) {
      file.moduleFormatter.exportSpecifier(node.specifiers[i], node, nodes, parent);
    }
  }

  keepBlockHoist(node, nodes);

  return nodes;
}
},{"../../../types":167}],97:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ObjectExpression = ObjectExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersReplaceSupers = require("../../helpers/replace-supers");

var _helpersReplaceSupers2 = _interopRequireDefault(_helpersReplaceSupers);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function Property(path, node, scope, getObjectRef, file) {
  if (!node.method && node.kind === "init") return;
  if (!t.isFunction(node.value)) return;

  var replaceSupers = new _helpersReplaceSupers2["default"]({
    getObjectRef: getObjectRef,
    methodNode: node,
    methodPath: path,
    isStatic: true,
    scope: scope,
    file: file
  });

  replaceSupers.replace();
}

function ObjectExpression(node, parent, scope, file) {
  var objectRef;
  var getObjectRef = function getObjectRef() {
    return objectRef = objectRef || scope.generateUidIdentifier("obj");
  };

  var propPaths = this.get("properties");
  for (var i = 0; i < node.properties.length; i++) {
    Property(propPaths[i], node.properties[i], scope, getObjectRef, file);
  }

  if (objectRef) {
    scope.push({ id: objectRef });
    return t.assignmentExpression("=", objectRef, node);
  }
}
},{"../../../types":167,"../../helpers/replace-supers":68}],98:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Func = Func;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersCallDelegate = require("../../helpers/call-delegate");

var _helpersCallDelegate2 = _interopRequireDefault(_helpersCallDelegate);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var hasDefaults = function hasDefaults(node) {
  for (var i = 0; i < node.params.length; i++) {
    if (!t.isIdentifier(node.params[i])) return true;
  }
  return false;
};

var iifeVisitor = {
  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    if (node.name !== "eval") {
      if (!state.scope.hasOwnBinding(node.name)) return;
      if (state.scope.bindingIdentifierEquals(node.name, node)) return;
    }

    state.iife = true;
    this.stop();
  }
};

function Func(node, parent, scope, file) {
  if (!hasDefaults(node)) return;

  t.ensureBlock(node);

  var body = [];

  var argsIdentifier = t.identifier("arguments");
  argsIdentifier._shadowedFunctionLiteral = true;

  var lastNonDefaultParam = 0;

  var state = { iife: false, scope: scope };

  var pushDefNode = function pushDefNode(left, right, i) {
    var defNode = util.template("default-parameter", {
      VARIABLE_NAME: left,
      DEFAULT_VALUE: right,
      ARGUMENT_KEY: t.literal(i),
      ARGUMENTS: argsIdentifier
    }, true);
    defNode._blockHoist = node.params.length - i;
    body.push(defNode);
  };

  var params = this.get("params");
  for (var i = 0; i < params.length; i++) {
    var param = params[i];

    if (!param.isAssignmentPattern()) {
      if (!param.isRestElement()) {
        lastNonDefaultParam = i + 1;
      }

      if (!param.isIdentifier()) {
        param.traverse(iifeVisitor, state);
      }

      if (file.transformers["es6.spec.blockScoping"].canTransform() && param.isIdentifier()) {
        pushDefNode(param.node, t.identifier("undefined"), i);
      }

      continue;
    }

    var left = param.get("left");
    var right = param.get("right");

    var placeholder = scope.generateUidIdentifier("x");
    placeholder._isDefaultPlaceholder = true;
    node.params[i] = placeholder;

    if (!state.iife) {
      if (right.isIdentifier() && scope.hasOwnBinding(right.node.name)) {
        state.iife = true;
      } else {
        right.traverse(iifeVisitor, state);
      }
    }

    pushDefNode(left.node, right.node, i);
  }

  // we need to cut off all trailing default parameters
  node.params = node.params.slice(0, lastNonDefaultParam);

  if (state.iife) {
    body.push((0, _helpersCallDelegate2["default"])(node, scope));
    node.body = t.blockStatement(body);
  } else {
    node.body.body = body.concat(node.body.body);
  }
}
},{"../../../traversal":156,"../../../types":167,"../../../util":171,"../../helpers/call-delegate":59}],99:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Func = Func;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsNumber = require("lodash/lang/isNumber");

var _lodashLangIsNumber2 = _interopRequireDefault(_lodashLangIsNumber);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var memberExpressionOptimisationVisitor = {
  enter: function enter(node, parent, scope, state) {
    // check if this scope has a local binding that will shadow the rest parameter
    if (this.isScope() && !scope.bindingIdentifierEquals(state.name, state.outerBinding)) {
      return this.skip();
    }

    // skip over functions as whatever `arguments` we reference inside will refer
    // to the wrong function
    if (this.isFunctionDeclaration() || this.isFunctionExpression()) {
      state.noOptimise = true;
      this.traverse(memberExpressionOptimisationVisitor, state);
      state.noOptimise = false;
      return this.skip();
    }

    // is this a referenced identifier and is it referencing the rest parameter?
    if (!this.isReferencedIdentifier({ name: state.name })) return;

    if (!state.noOptimise && t.isMemberExpression(parent) && parent.computed) {
      // if we know that this member expression is referencing a number then we can safely
      // optimise it
      var prop = parent.property;
      if ((0, _lodashLangIsNumber2["default"])(prop.value) || t.isUnaryExpression(prop) || t.isBinaryExpression(prop)) {
        state.candidates.push(this);
        return;
      }
    }

    state.canOptimise = false;
    this.stop();
  }
};

function optimizeMemberExpression(parent, offset) {
  var newExpr;
  var prop = parent.property;

  if (t.isLiteral(prop)) {
    prop.value += offset;
    prop.raw = String(prop.value);
  } else {
    // // UnaryExpression, BinaryExpression
    newExpr = t.binaryExpression("+", prop, t.literal(offset));
    parent.property = newExpr;
  }
}

var hasRest = function hasRest(node) {
  return t.isRestElement(node.params[node.params.length - 1]);
};

function Func(node, parent, scope, file) {
  if (!hasRest(node)) return;

  var restParam = node.params.pop();
  var rest = restParam.argument;

  var argsId = t.identifier("arguments");

  // otherwise `arguments` will be remapped in arrow functions
  argsId._shadowedFunctionLiteral = true;

  // support patterns
  if (t.isPattern(rest)) {
    var pattern = rest;
    rest = scope.generateUidIdentifier("ref");

    var declar = t.variableDeclaration("let", pattern.elements.map(function (elem, index) {
      var accessExpr = t.memberExpression(rest, t.literal(index), true);
      return t.variableDeclarator(elem, accessExpr);
    }));
    node.body.body.unshift(declar);
  }

  // check if rest is used in member expressions and optimise for those cases

  var state = {
    outerBinding: scope.getBindingIdentifier(rest.name),
    canOptimise: true,
    candidates: [],
    method: node,
    name: rest.name
  };

  this.traverse(memberExpressionOptimisationVisitor, state);

  // we only have shorthands and there's no other references
  if (state.canOptimise && state.candidates.length) {
    for (var i = 0; i < state.candidates.length; i++) {
      var candidate = state.candidates[i];
      candidate.replaceWith(argsId);
      optimizeMemberExpression(candidate.parent, node.params.length);
    }
    return;
  }

  //

  var start = t.literal(node.params.length);
  var key = scope.generateUidIdentifier("key");
  var len = scope.generateUidIdentifier("len");

  var arrKey = key;
  var arrLen = len;
  if (node.params.length) {
    // this method has additional params, so we need to subtract
    // the index of the current argument position from the
    // position in the array that we want to populate
    arrKey = t.binaryExpression("-", key, start);

    // we need to work out the size of the array that we're
    // going to store all the rest parameters
    //
    // we need to add a check to avoid constructing the array
    // with <0 if there are less arguments than params as it'll
    // cause an error
    arrLen = t.conditionalExpression(t.binaryExpression(">", len, start), t.binaryExpression("-", len, start), t.literal(0));
  }

  var loop = util.template("rest", {
    ARRAY_TYPE: restParam.typeAnnotation,
    ARGUMENTS: argsId,
    ARRAY_KEY: arrKey,
    ARRAY_LEN: arrLen,
    START: start,
    ARRAY: rest,
    KEY: key,
    LEN: len
  });
  loop._blockHoist = node.params.length + 1;
  node.body.body.unshift(loop);
}
},{"../../../types":167,"../../../util":171,"lodash/lang/isNumber":408}],100:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function loose(node, body, objId) {
  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];

    body.push(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(objId, prop.key, prop.computed || t.isLiteral(prop.key)), prop.value)));
  }
}

function spec(node, body, objId, initProps, file) {
  var props = node.properties;

  // add all non-computed properties and `__proto__` properties to the initializer

  var broken = false;

  for (var i = 0; i < props.length; i++) {
    var prop = props[i];

    if (prop.computed) {
      broken = true;
    }

    if (prop.kind !== "init" || !broken || t.isLiteral(t.toComputedKey(prop, prop.key), { value: "__proto__" })) {
      initProps.push(prop);
      props[i] = null;
    }
  }

  // add a simple assignment for all Symbol member expressions due to symbol polyfill limitations
  // otherwise use Object.defineProperty

  for (var i = 0; i < props.length; i++) {
    var prop = props[i];
    if (!prop) continue;

    var key = prop.key;
    if (t.isIdentifier(key) && !prop.computed) {
      key = t.literal(key.name);
    }

    var bodyNode = t.callExpression(file.addHelper("define-property"), [objId, key, prop.value]);

    body.push(t.expressionStatement(bodyNode));
  }

  // only one node and it's a Object.defineProperty that returns the object

  if (body.length === 1) {
    var first = body[0].expression;

    if (t.isCallExpression(first)) {
      first.arguments[0] = t.objectExpression(initProps);
      return first;
    }
  }
}

var ObjectExpression = {
  exit: function exit(node, parent, scope, file) {
    var hasComputed = false;

    var _arr = node.properties;
    for (var _i = 0; _i < _arr.length; _i++) {
      var prop = _arr[_i];
      hasComputed = t.isProperty(prop, { computed: true, kind: "init" });
      if (hasComputed) break;
    }

    if (!hasComputed) return;

    var initProps = [];
    var objId = scope.generateUidBasedOnNode(parent);

    //

    var body = [];

    //

    var callback = spec;
    if (file.isLoose("es6.properties.computed")) callback = loose;

    var result = callback(node, body, objId, initProps, file);
    if (result) return result;

    //

    body.unshift(t.variableDeclaration("var", [t.variableDeclarator(objId, t.objectExpression(initProps))]));

    body.push(t.expressionStatement(objId));

    return body;
  }
};
exports.ObjectExpression = ObjectExpression;
},{"../../../types":167}],101:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Property = Property;

function Property(node) {
  if (node.method) {
    node.method = false;
  }

  if (node.shorthand) {
    node.shorthand = false;
  }
}
},{}],102:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Literal = Literal;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersRegex = require("../../helpers/regex");

var regex = _interopRequireWildcard(_helpersRegex);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function Literal(node) {
  if (!regex.is(node, "y")) return;
  return t.newExpression(t.identifier("RegExp"), [t.literal(node.regex.pattern), t.literal(node.regex.flags)]);
}
},{"../../../types":167,"../../helpers/regex":66}],103:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Literal = Literal;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _regexpuRewritePattern = require("regexpu/rewrite-pattern");

var _regexpuRewritePattern2 = _interopRequireDefault(_regexpuRewritePattern);

var _helpersRegex = require("../../helpers/regex");

var regex = _interopRequireWildcard(_helpersRegex);

function Literal(node) {
  if (!regex.is(node, "u")) return;
  node.regex.pattern = (0, _regexpuRewritePattern2["default"])(node.regex.pattern, node.regex.flags);
  regex.pullFlag(node, "u");
}
},{"../../helpers/regex":66,"regexpu/rewrite-pattern":475}],104:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var visitor = {
  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    if (t.isFor(parent) && parent.left === node) return;

    var declared = state.letRefs[node.name];
    if (!declared) return;

    // declared node is different in this scope
    if (scope.getBindingIdentifier(node.name) !== declared) return;

    var assert = t.callExpression(state.file.addHelper("temporal-assert-defined"), [node, t.literal(node.name), state.file.addHelper("temporal-undefined")]);

    this.skip();

    if (t.isAssignmentExpression(parent) || t.isUpdateExpression(parent)) {
      if (parent._ignoreBlockScopingTDZ) return;
      this.parentPath.replaceWith(t.sequenceExpression([assert, parent]));
    } else {
      return t.logicalExpression("&&", assert, node);
    }
  }
};

var metadata = {
  optional: true,
  group: "builtin-advanced"
};

exports.metadata = metadata;
var BlockStatement = {
  exit: function exit(node, parent, scope, file) {
    var letRefs = node._letReferences;
    if (!letRefs) return;

    this.traverse(visitor, {
      letRefs: letRefs,
      file: file
    });
  }
};

exports.BlockStatement = BlockStatement;
exports.Program = BlockStatement;
exports.Loop = BlockStatement;
},{"../../../traversal":156,"../../../types":167}],105:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.UnaryExpression = UnaryExpression;
exports.BinaryExpression = BinaryExpression;
exports.VariableDeclaration = VariableDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true
};

exports.metadata = metadata;

function UnaryExpression(node, parent, scope, file) {
  if (node._ignoreSpecSymbols) return;

  if (node.operator === "typeof") {
    var call = t.callExpression(file.addHelper("typeof"), [node.argument]);
    if (this.get("argument").isIdentifier()) {
      var undefLiteral = t.literal("undefined");
      var unary = t.unaryExpression("typeof", node.argument);
      unary._ignoreSpecSymbols = true;
      return t.conditionalExpression(t.binaryExpression("===", unary, undefLiteral), undefLiteral, call);
    } else {
      return call;
    }
  }
}

function BinaryExpression(node, parent, scope, file) {
  if (node.operator === "instanceof") {
    return t.callExpression(file.addHelper("instanceof"), [node.left, node.right]);
  }
}

function VariableDeclaration(node) {
  if (node._generated) this.skip();
}

exports.FunctionDeclaration = VariableDeclaration;
},{"../../../types":167}],106:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.TemplateLiteral = TemplateLiteral;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true
};

exports.metadata = metadata;

function TemplateLiteral(node, parent, scope, file) {
  if (t.isTaggedTemplateExpression(parent)) return;

  for (var i = 0; i < node.expressions.length; i++) {
    node.expressions[i] = t.callExpression(t.identifier("String"), [node.expressions[i]]);
  }
}
},{"../../../types":167}],107:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ArrayExpression = ArrayExpression;
exports.CallExpression = CallExpression;
exports.NewExpression = NewExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function getSpreadLiteral(spread, scope) {
  if (scope.file.isLoose("es6.spread")) {
    return spread.argument;
  } else {
    return scope.toArray(spread.argument, true);
  }
}

function hasSpread(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (t.isSpreadElement(nodes[i])) {
      return true;
    }
  }
  return false;
}

function build(props, scope) {
  var nodes = [];

  var _props = [];

  var push = function push() {
    if (!_props.length) return;
    nodes.push(t.arrayExpression(_props));
    _props = [];
  };

  for (var i = 0; i < props.length; i++) {
    var prop = props[i];
    if (t.isSpreadElement(prop)) {
      push();
      nodes.push(getSpreadLiteral(prop, scope));
    } else {
      _props.push(prop);
    }
  }

  push();

  return nodes;
}

function ArrayExpression(node, parent, scope) {
  var elements = node.elements;
  if (!hasSpread(elements)) return;

  var nodes = build(elements, scope);
  var first = nodes.shift();

  if (!t.isArrayExpression(first)) {
    nodes.unshift(first);
    first = t.arrayExpression([]);
  }

  return t.callExpression(t.memberExpression(first, t.identifier("concat")), nodes);
}

function CallExpression(node, parent, scope) {
  var args = node.arguments;
  if (!hasSpread(args)) return;

  var contextLiteral = t.identifier("undefined");

  node.arguments = [];

  var nodes;
  if (args.length === 1 && args[0].argument.name === "arguments") {
    nodes = [args[0].argument];
  } else {
    nodes = build(args, scope);
  }

  var first = nodes.shift();
  if (nodes.length) {
    node.arguments.push(t.callExpression(t.memberExpression(first, t.identifier("concat")), nodes));
  } else {
    node.arguments.push(first);
  }

  var callee = node.callee;

  if (this.get("callee").isMemberExpression()) {
    var temp = scope.generateMemoisedReference(callee.object);
    if (temp) {
      callee.object = t.assignmentExpression("=", temp, callee.object);
      contextLiteral = temp;
    } else {
      contextLiteral = callee.object;
    }
    t.appendToMemberExpression(callee, t.identifier("apply"));
  } else {
    node.callee = t.memberExpression(node.callee, t.identifier("apply"));
  }

  node.arguments.unshift(contextLiteral);
}

function NewExpression(node, parent, scope, file) {
  var args = node.arguments;
  if (!hasSpread(args)) return;

  var nodes = build(args, scope);

  var context = t.arrayExpression([t.literal(null)]);

  args = t.callExpression(t.memberExpression(context, t.identifier("concat")), nodes);

  return t.newExpression(t.callExpression(t.memberExpression(file.addHelper("bind"), t.identifier("apply")), [node.callee, args]), []);
}
},{"../../../types":167,"lodash/collection/includes":330}],108:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Func = Func;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodashCollectionReduceRight = require("lodash/collection/reduceRight");

var _lodashCollectionReduceRight2 = _interopRequireDefault(_lodashCollectionReduceRight);

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _lodashArrayFlatten = require("lodash/array/flatten");

var _lodashArrayFlatten2 = _interopRequireDefault(_lodashArrayFlatten);

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _lodashCollectionMap = require("lodash/collection/map");

var _lodashCollectionMap2 = _interopRequireDefault(_lodashCollectionMap);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-trailing"
};

exports.metadata = metadata;

function Func(node, parent, scope, file) {
  if (node.generator || node.async) return;
  var tailCall = new TailCallTransformer(this, scope, file);
  tailCall.run();
}

function returnBlock(expr) {
  return t.blockStatement([t.returnStatement(expr)]);
}

var visitor = {
  enter: function enter(node, parent, scope, state) {
    if (t.isTryStatement(parent)) {
      if (node === parent.block) {
        this.skip();
      } else if (parent.finalizer && node !== parent.finalizer) {
        this.skip();
      }
    }
  },

  ReturnStatement: function ReturnStatement(node, parent, scope, state) {
    return state.subTransform(node.argument);
  },

  Function: function Function(node, parent, scope, state) {
    this.skip();
  },

  VariableDeclaration: function VariableDeclaration(node, parent, scope, state) {
    state.vars.push(node);
  },

  ThisExpression: function ThisExpression(node, parent, scope, state) {
    state.needsThis = true;
    state.thisPaths.push(this);
  },

  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    if (node.name === "arguments") {
      state.needsArguments = true;
      state.argumentsPaths.push(this);
    }
  }
};

var TailCallTransformer = (function () {
  function TailCallTransformer(path, scope, file) {
    _classCallCheck(this, TailCallTransformer);

    this.hasTailRecursion = false;

    this.needsArguments = false;
    this.argumentsPaths = [];
    this.setsArguments = false;

    this.needsThis = false;
    this.thisPaths = [];

    this.ownerId = path.node.id;
    this.vars = [];

    this.scope = scope;
    this.path = path;
    this.file = file;
    this.node = path.node;
  }

  TailCallTransformer.prototype.getArgumentsId = function getArgumentsId() {
    return this.argumentsId = this.argumentsId || this.scope.generateUidIdentifier("arguments");
  };

  TailCallTransformer.prototype.getThisId = function getThisId() {
    return this.thisId = this.thisId || this.scope.generateUidIdentifier("this");
  };

  TailCallTransformer.prototype.getLeftId = function getLeftId() {
    return this.leftId = this.leftId || this.scope.generateUidIdentifier("left");
  };

  TailCallTransformer.prototype.getFunctionId = function getFunctionId() {
    return this.functionId = this.functionId || this.scope.generateUidIdentifier("function");
  };

  TailCallTransformer.prototype.getAgainId = function getAgainId() {
    return this.againId = this.againId || this.scope.generateUidIdentifier("again");
  };

  TailCallTransformer.prototype.getParams = function getParams() {
    var params = this.params;

    if (!params) {
      params = this.node.params;
      this.paramDecls = [];

      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (!param._isDefaultPlaceholder) {
          this.paramDecls.push(t.variableDeclarator(param, params[i] = this.scope.generateUidIdentifier("x")));
        }
      }
    }

    return this.params = params;
  };

  TailCallTransformer.prototype.hasDeopt = function hasDeopt() {
    // check if the ownerId has been reassigned, if it has then it's not safe to
    // perform optimisations
    var ownerIdInfo = this.scope.getBinding(this.ownerId.name);
    return ownerIdInfo && !ownerIdInfo.constant;
  };

  TailCallTransformer.prototype.run = function run() {
    var scope = this.scope;
    var node = this.node;

    // only tail recursion can be optimized as for now, so we can skip anonymous
    // functions entirely
    var ownerId = this.ownerId;
    if (!ownerId) return;

    // traverse the function and look for tail recursion
    this.path.traverse(visitor, this);

    // has no tail call recursion
    if (!this.hasTailRecursion) return;

    // the function binding isn't constant so we can't be sure that it's the same function :(
    if (this.hasDeopt()) {
      this.file.log.deopt(node, messages.get("tailCallReassignmentDeopt"));
      return;
    }

    //

    var body = t.ensureBlock(node).body;

    for (var i = 0; i < body.length; i++) {
      var bodyNode = body[i];
      if (!t.isFunctionDeclaration(bodyNode)) continue;

      bodyNode = body[i] = t.variableDeclaration("var", [t.variableDeclarator(bodyNode.id, t.toExpression(bodyNode))]);
      bodyNode._blockHoist = 2;
    }

    if (this.vars.length > 0) {
      var declarations = (0, _lodashArrayFlatten2["default"])((0, _lodashCollectionMap2["default"])(this.vars, function (decl) {
        return decl.declarations;
      }));

      var assignment = (0, _lodashCollectionReduceRight2["default"])(declarations, function (expr, decl) {
        return t.assignmentExpression("=", decl.id, expr);
      }, t.identifier("undefined"));

      var statement = t.expressionStatement(assignment);
      statement._blockHoist = Infinity;
      body.unshift(statement);
    }

    var paramDecls = this.paramDecls;
    if (paramDecls.length > 0) {
      var paramDecl = t.variableDeclaration("var", paramDecls);
      paramDecl._blockHoist = Infinity;
      body.unshift(paramDecl);
    }

    body.unshift(t.expressionStatement(t.assignmentExpression("=", this.getAgainId(), t.literal(false))));

    node.body = util.template("tail-call-body", {
      FUNCTION_ID: this.getFunctionId(),
      AGAIN_ID: this.getAgainId(),
      BLOCK: node.body
    });

    var topVars = [];

    if (this.needsThis) {
      var _arr = this.thisPaths;

      for (var _i = 0; _i < _arr.length; _i++) {
        var path = _arr[_i];
        path.replaceWith(this.getThisId());
      }

      topVars.push(t.variableDeclarator(this.getThisId(), t.thisExpression()));
    }

    if (this.needsArguments || this.setsArguments) {
      var _arr2 = this.argumentsPaths;

      for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
        var path = _arr2[_i2];
        path.replaceWith(this.argumentsId);
      }

      var decl = t.variableDeclarator(this.argumentsId);
      if (this.argumentsId) {
        decl.init = t.identifier("arguments");
      }
      topVars.push(decl);
    }

    var leftId = this.leftId;
    if (leftId) {
      topVars.push(t.variableDeclarator(leftId));
    }

    if (topVars.length > 0) {
      node.body.body.unshift(t.variableDeclaration("var", topVars));
    }
  };

  TailCallTransformer.prototype.subTransform = function subTransform(node) {
    if (!node) return;

    var handler = this["subTransform" + node.type];
    if (handler) return handler.call(this, node);
  };

  TailCallTransformer.prototype.subTransformConditionalExpression = function subTransformConditionalExpression(node) {
    var callConsequent = this.subTransform(node.consequent);
    var callAlternate = this.subTransform(node.alternate);
    if (!callConsequent && !callAlternate) {
      return;
    }

    // if ternary operator had tail recursion in value, convert to optimized if-statement
    node.type = "IfStatement";
    node.consequent = callConsequent ? t.toBlock(callConsequent) : returnBlock(node.consequent);

    if (callAlternate) {
      node.alternate = t.isIfStatement(callAlternate) ? callAlternate : t.toBlock(callAlternate);
    } else {
      node.alternate = returnBlock(node.alternate);
    }

    return [node];
  };

  TailCallTransformer.prototype.subTransformLogicalExpression = function subTransformLogicalExpression(node) {
    // only call in right-value of can be optimized
    var callRight = this.subTransform(node.right);
    if (!callRight) return;

    // cache left value as it might have side-effects
    var leftId = this.getLeftId();
    var testExpr = t.assignmentExpression("=", leftId, node.left);

    if (node.operator === "&&") {
      testExpr = t.unaryExpression("!", testExpr);
    }

    return [t.ifStatement(testExpr, returnBlock(leftId))].concat(callRight);
  };

  TailCallTransformer.prototype.subTransformSequenceExpression = function subTransformSequenceExpression(node) {
    var seq = node.expressions;

    // only last element can be optimized
    var lastCall = this.subTransform(seq[seq.length - 1]);
    if (!lastCall) {
      return;
    }

    // remove converted expression from sequence
    // and convert to regular expression if needed
    if (--seq.length === 1) {
      node = seq[0];
    }

    return [t.expressionStatement(node)].concat(lastCall);
  };

  TailCallTransformer.prototype.subTransformCallExpression = function subTransformCallExpression(node) {
    var callee = node.callee,
        thisBinding,
        args;

    if (t.isMemberExpression(callee, { computed: false }) && t.isIdentifier(callee.property)) {
      switch (callee.property.name) {
        case "call":
          args = t.arrayExpression(node.arguments.slice(1));
          break;

        case "apply":
          args = node.arguments[1] || t.identifier("undefined");
          break;

        default:
          return;
      }

      thisBinding = node.arguments[0];
      callee = callee.object;
    }

    // only tail recursion can be optimized as for now
    if (!t.isIdentifier(callee) || !this.scope.bindingIdentifierEquals(callee.name, this.ownerId)) {
      return;
    }

    this.hasTailRecursion = true;

    if (this.hasDeopt()) return;

    var body = [];

    if (this.needsThis && !t.isThisExpression(thisBinding)) {
      body.push(t.expressionStatement(t.assignmentExpression("=", this.getThisId(), thisBinding || t.identifier("undefined"))));
    }

    if (!args) {
      args = t.arrayExpression(node.arguments);
    }

    var argumentsId = this.getArgumentsId();
    var params = this.getParams();

    if (this.needsArguments) {
      body.push(t.expressionStatement(t.assignmentExpression("=", argumentsId, args)));
    }

    if (t.isArrayExpression(args)) {
      var elems = args.elements;
      for (var i = 0; i < elems.length && i < params.length; i++) {
        var param = params[i];
        var elem = elems[i] || (elems[i] = t.identifier("undefined"));
        if (!param._isDefaultPlaceholder) {
          elems[i] = t.assignmentExpression("=", param, elem);
        }
      }

      if (!this.needsArguments) {
        var _arr3 = elems;

        for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
          var elem = _arr3[_i3];
          body.push(t.expressionStatement(elem));
        }
      }
    } else {
      this.setsArguments = true;
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (!param._isDefaultPlaceholder) {
          body.push(t.expressionStatement(t.assignmentExpression("=", param, t.memberExpression(argumentsId, t.literal(i), true))));
        }
      }
    }

    body.push(t.expressionStatement(t.assignmentExpression("=", this.getAgainId(), t.literal(true))));

    body.push(t.continueStatement(this.getFunctionId()));

    return body;
  };

  return TailCallTransformer;
})();
},{"../../../messages":46,"../../../traversal":156,"../../../types":167,"../../../util":171,"lodash/array/flatten":323,"lodash/collection/map":331,"lodash/collection/reduceRight":332}],109:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.TaggedTemplateExpression = TaggedTemplateExpression;
exports.TemplateLiteral = TemplateLiteral;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var buildBinaryExpression = function buildBinaryExpression(left, right) {
  return t.binaryExpression("+", left, right);
};

function TaggedTemplateExpression(node, parent, scope, file) {
  var quasi = node.quasi;
  var args = [];

  var strings = [];
  var raw = [];

  for (var i = 0; i < quasi.quasis.length; i++) {
    var elem = quasi.quasis[i];
    strings.push(t.literal(elem.value.cooked));
    raw.push(t.literal(elem.value.raw));
  }

  strings = t.arrayExpression(strings);
  raw = t.arrayExpression(raw);

  var templateName = "tagged-template-literal";
  if (file.isLoose("es6.templateLiterals")) templateName += "-loose";
  args.push(t.callExpression(file.addHelper(templateName), [strings, raw]));

  args = args.concat(quasi.expressions);

  return t.callExpression(node.tag, args);
}

function TemplateLiteral(node, parent, scope, file) {
  var nodes = [];
  var i;

  for (i = 0; i < node.quasis.length; i++) {
    var elem = node.quasis[i];

    nodes.push(t.literal(elem.value.cooked));

    var expr = node.expressions.shift();
    if (expr) nodes.push(expr);
  }

  if (nodes.length > 1) {
    // remove redundant '' at the end of the expression
    var last = nodes[nodes.length - 1];
    if (t.isLiteral(last, { value: "" })) nodes.pop();

    var root = buildBinaryExpression(nodes.shift(), nodes.shift());

    for (i = 0; i < nodes.length; i++) {
      root = buildBinaryExpression(root, nodes[i]);
    }

    return root;
  } else {
    return nodes[0];
  }
}
},{"../../../types":167}],110:[function(require,module,exports){
"use strict";

exports.__esModule = true;
var metadata = {
  stage: 1
};
exports.metadata = metadata;
},{}],111:[function(require,module,exports){
"use strict";

exports.__esModule = true;
var metadata = {
  stage: 0,
  dependencies: ["es6.classes"]
};
exports.metadata = metadata;
},{}],112:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ComprehensionExpression = ComprehensionExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersBuildComprehension = require("../../helpers/build-comprehension");

var _helpersBuildComprehension2 = _interopRequireDefault(_helpersBuildComprehension);

var _traversal = require("../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _util = require("../../../util");

var util = _interopRequireWildcard(_util);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  stage: 0
};

exports.metadata = metadata;

function ComprehensionExpression(node, parent, scope, file) {
  var callback = array;
  if (node.generator) callback = generator;
  return callback(node, parent, scope, file);
}

function generator(node) {
  var body = [];
  var container = t.functionExpression(null, [], t.blockStatement(body), true);
  container.shadow = true;

  body.push((0, _helpersBuildComprehension2["default"])(node, function () {
    return t.expressionStatement(t.yieldExpression(node.body));
  }));

  return t.callExpression(container, []);
}

function array(node, parent, scope, file) {
  var uid = scope.generateUidBasedOnNode(parent);

  var container = util.template("array-comprehension-container", {
    KEY: uid
  });
  container.callee.shadow = true;

  var block = container.callee.body;
  var body = block.body;

  if (_traversal2["default"].hasType(node, scope, "YieldExpression", t.FUNCTION_TYPES)) {
    container.callee.generator = true;
    container = t.yieldExpression(container, true);
  }

  var returnStatement = body.pop();

  body.push((0, _helpersBuildComprehension2["default"])(node, function () {
    return util.template("array-push", {
      STATEMENT: node.body,
      KEY: uid
    }, true);
  }));
  body.push(returnStatement);

  return container;
}
},{"../../../traversal":156,"../../../types":167,"../../../util":171,"../../helpers/build-comprehension":57}],113:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ObjectExpression = ObjectExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersMemoiseDecorators = require("../../helpers/memoise-decorators");

var _helpersMemoiseDecorators2 = _interopRequireDefault(_helpersMemoiseDecorators);

var _helpersDefineMap = require("../../helpers/define-map");

var defineMap = _interopRequireWildcard(_helpersDefineMap);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  dependencies: ["es6.classes"],
  optional: true,
  stage: 1
};

exports.metadata = metadata;

function ObjectExpression(node, parent, scope, file) {
  var hasDecorators = false;
  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];
    if (prop.decorators) {
      hasDecorators = true;
      break;
    }
  }
  if (!hasDecorators) return;

  var mutatorMap = {};

  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];
    if (prop.decorators) (0, _helpersMemoiseDecorators2["default"])(prop.decorators, scope);

    if (prop.kind === "init") {
      prop.kind = "";
      prop.value = t.functionExpression(null, [], t.blockStatement([t.returnStatement(prop.value)]));
    }

    defineMap.push(mutatorMap, prop, "initializer", file);
  }

  var obj = defineMap.toClassObject(mutatorMap);
  obj = defineMap.toComputedObjectFromClass(obj);
  return t.callExpression(file.addHelper("create-decorated-object"), [obj]);
}
},{"../../../types":167,"../../helpers/define-map":60,"../../helpers/memoise-decorators":63}],114:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.DoExpression = DoExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  stage: 0
};

exports.metadata = metadata;

function DoExpression(node) {
  var body = node.body.body;
  if (body.length) {
    return body;
  } else {
    return t.identifier("undefined");
  }
}
},{"../../../types":167}],115:[function(require,module,exports){
// https://github.com/rwaldron/exponentiation-operator

"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersBuildBinaryAssignmentOperatorTransformer = require("../../helpers/build-binary-assignment-operator-transformer");

var _helpersBuildBinaryAssignmentOperatorTransformer2 = _interopRequireDefault(_helpersBuildBinaryAssignmentOperatorTransformer);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  stage: 2
};

exports.metadata = metadata;
var MATH_POW = t.memberExpression(t.identifier("Math"), t.identifier("pow"));

var _build = (0, _helpersBuildBinaryAssignmentOperatorTransformer2["default"])({
  operator: "**",

  build: function build(left, right) {
    return t.callExpression(MATH_POW, [left, right]);
  }
});

var ExpressionStatement = _build.ExpressionStatement;
var AssignmentExpression = _build.AssignmentExpression;
var BinaryExpression = _build.BinaryExpression;
exports.ExpressionStatement = ExpressionStatement;
exports.AssignmentExpression = AssignmentExpression;
exports.BinaryExpression = BinaryExpression;
},{"../../../types":167,"../../helpers/build-binary-assignment-operator-transformer":56}],116:[function(require,module,exports){
// https://github.com/leebyron/ecmascript-more-export-from

"use strict";

exports.__esModule = true;
exports.ExportNamedDeclaration = ExportNamedDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  stage: 1
};

exports.metadata = metadata;
function build(node, nodes, scope) {
  var first = node.specifiers[0];
  if (!t.isExportNamespaceSpecifier(first) && !t.isExportDefaultSpecifier(first)) return;

  var specifier = node.specifiers.shift();
  var uid = scope.generateUidIdentifier(specifier.exported.name);

  var newSpecifier;
  if (t.isExportNamespaceSpecifier(specifier)) {
    newSpecifier = t.importNamespaceSpecifier(uid);
  } else {
    newSpecifier = t.importDefaultSpecifier(uid);
  }

  nodes.push(t.importDeclaration([newSpecifier], node.source));
  nodes.push(t.exportNamedDeclaration(null, [t.exportSpecifier(uid, specifier.exported)]));

  build(node, nodes, scope);
}

function ExportNamedDeclaration(node, parent, scope) {
  var nodes = [];
  build(node, nodes, scope);
  if (!nodes.length) return;

  if (node.specifiers.length >= 1) {
    nodes.push(node);
  }

  return nodes;
}
},{"../../../types":167}],117:[function(require,module,exports){
// https://github.com/sebmarkbage/ecmascript-rest-spread

"use strict";

exports.__esModule = true;
exports.ObjectExpression = ObjectExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  stage: 1,
  dependencies: ["es6.destructuring"]
};

exports.metadata = metadata;
var hasSpread = function hasSpread(node) {
  for (var i = 0; i < node.properties.length; i++) {
    if (t.isSpreadProperty(node.properties[i])) {
      return true;
    }
  }
  return false;
};

function ObjectExpression(node, parent, scope, file) {
  if (!hasSpread(node)) return;

  var args = [];
  var props = [];

  var push = function push() {
    if (!props.length) return;
    args.push(t.objectExpression(props));
    props = [];
  };

  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];
    if (t.isSpreadProperty(prop)) {
      push();
      args.push(prop.argument);
    } else {
      props.push(prop);
    }
  }

  push();

  if (!t.isObjectExpression(args[0])) {
    args.unshift(t.objectExpression([]));
  }

  return t.callExpression(file.addHelper("extends"), args);
}
},{"../../../types":167}],118:[function(require,module,exports){
arguments[4][110][0].apply(exports,arguments)
},{"dup":110}],119:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.internal = internal;
exports.blacklist = blacklist;
exports.whitelist = whitelist;
exports.stage = stage;
exports.optional = optional;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

function internal(transformer, opts) {
  if (transformer.key[0] === "_") return true;
}

function blacklist(transformer, opts) {
  var blacklist = opts.blacklist;
  if (blacklist.length && (0, _lodashCollectionIncludes2["default"])(blacklist, transformer.key)) return false;
}

function whitelist(transformer, opts) {
  var whitelist = opts.whitelist;
  if (whitelist) return (0, _lodashCollectionIncludes2["default"])(whitelist, transformer.key);
}

function stage(transformer, opts) {
  var stage = transformer.metadata.stage;
  if (stage != null && stage >= opts.stage) return true;
}

function optional(transformer, opts) {
  if (transformer.metadata.optional && !(0, _lodashCollectionIncludes2["default"])(opts.optional, transformer.key)) return false;
}
},{"lodash/collection/includes":330}],120:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = {
  //- builtin-setup
  _explode: require("./internal/explode"),
  _validation: require("./internal/validation"),
  _hoistDirectives: require("./internal/hoist-directives"),
  "minification.removeDebugger": require("./minification/remove-debugger"),
  "minification.removeConsole": require("./minification/remove-console"),
  "utility.inlineEnvironmentVariables": require("./utility/inline-environment-variables"),
  "minification.inlineExpressions": require("./minification/inline-expressions"),
  "minification.deadCodeElimination": require("./minification/dead-code-elimination"),
  _modules: require("./internal/modules"),
  "spec.functionName": require("./spec/function-name"),

  //- builtin-basic
  // this is where the bulk of the ES6 transformations take place, none of them require traversal state
  // so they can all be concatenated together for performance
  "es7.classProperties": require("./es7/class-properties"),
  "es7.trailingFunctionCommas": require("./es7/trailing-function-commas"),
  "es7.asyncFunctions": require("./es7/async-functions"),
  "es7.decorators": require("./es7/decorators"),
  strict: require("./other/strict"),
  "validation.undeclaredVariableCheck": require("./validation/undeclared-variable-check"),
  "validation.react": require("./validation/react"),
  "es6.arrowFunctions": require("./es6/arrow-functions"),
  "spec.blockScopedFunctions": require("./spec/block-scoped-functions"),
  "optimisation.react.constantElements": require("./optimisation/react.constant-elements"),
  "optimisation.react.inlineElements": require("./optimisation/react.inline-elements"),
  reactCompat: require("./other/react-compat"),
  react: require("./other/react"),
  "es7.comprehensions": require("./es7/comprehensions"),
  "es6.classes": require("./es6/classes"),
  asyncToGenerator: require("./other/async-to-generator"),
  bluebirdCoroutines: require("./other/bluebird-coroutines"),
  "es6.objectSuper": require("./es6/object-super"),
  "es7.objectRestSpread": require("./es7/object-rest-spread"),
  "es7.exponentiationOperator": require("./es7/exponentiation-operator"),
  "es6.spec.templateLiterals": require("./es6/spec.template-literals"),
  "es6.templateLiterals": require("./es6/template-literals"),
  "es5.properties.mutators": require("./es5/properties.mutators"),
  "es6.properties.shorthand": require("./es6/properties.shorthand"),
  "es6.properties.computed": require("./es6/properties.computed"),
  "optimisation.flow.forOf": require("./optimisation/flow.for-of"),
  "es6.forOf": require("./es6/for-of"),
  "es6.regex.sticky": require("./es6/regex.sticky"),
  "es6.regex.unicode": require("./es6/regex.unicode"),
  "es6.constants": require("./es6/constants"),
  "es6.parameters.rest": require("./es6/parameters.rest"),
  "es6.spread": require("./es6/spread"),
  "es6.parameters.default": require("./es6/parameters.default"),
  "es7.exportExtensions": require("./es7/export-extensions"),
  "spec.protoToAssign": require("./spec/proto-to-assign"),
  "es7.doExpressions": require("./es7/do-expressions"),
  "es6.spec.symbols": require("./es6/spec.symbols"),
  "spec.undefinedToVoid": require("./spec/undefined-to-void"),
  jscript: require("./other/jscript"),
  flow: require("./other/flow"),

  //- builtin-advanced
  "es6.destructuring": require("./es6/destructuring"),
  "es6.blockScoping": require("./es6/block-scoping"),
  "es6.spec.blockScoping": require("./es6/spec.block-scoping"),

  // es6 syntax transformation is **forbidden** past this point since regenerator will chuck a massive
  // hissy fit

  //- regenerator
  regenerator: require("./other/regenerator"),

  //- builtin-modules
  runtime: require("./other/runtime"),
  "es6.modules": require("./es6/modules"),
  _moduleFormatter: require("./internal/module-formatter"),

  //- builtin-trailing
  // these clean up the output and do finishing up transformations, it's important to note that by this
  // stage you can't import any new modules or insert new ES6 as all those transformers have already
  // been ran
  "es6.tailCall": require("./es6/tail-call"),
  _shadowFunctions: require("./internal/shadow-functions"),
  "es3.propertyLiterals": require("./es3/property-literals"),
  "es3.memberExpressionLiterals": require("./es3/member-expression-literals"),
  "minification.memberExpressionLiterals": require("./minification/member-expression-literals"),
  "minification.propertyLiterals": require("./minification/property-literals"),
  _blockHoist: require("./internal/block-hoist") };
module.exports = exports["default"];
},{"./es3/member-expression-literals":87,"./es3/property-literals":88,"./es5/properties.mutators":89,"./es6/arrow-functions":90,"./es6/block-scoping":91,"./es6/classes":92,"./es6/constants":93,"./es6/destructuring":94,"./es6/for-of":95,"./es6/modules":96,"./es6/object-super":97,"./es6/parameters.default":98,"./es6/parameters.rest":99,"./es6/properties.computed":100,"./es6/properties.shorthand":101,"./es6/regex.sticky":102,"./es6/regex.unicode":103,"./es6/spec.block-scoping":104,"./es6/spec.symbols":105,"./es6/spec.template-literals":106,"./es6/spread":107,"./es6/tail-call":108,"./es6/template-literals":109,"./es7/async-functions":110,"./es7/class-properties":111,"./es7/comprehensions":112,"./es7/decorators":113,"./es7/do-expressions":114,"./es7/exponentiation-operator":115,"./es7/export-extensions":116,"./es7/object-rest-spread":117,"./es7/trailing-function-commas":118,"./internal/block-hoist":121,"./internal/explode":122,"./internal/hoist-directives":123,"./internal/module-formatter":124,"./internal/modules":125,"./internal/shadow-functions":126,"./internal/validation":127,"./minification/dead-code-elimination":128,"./minification/inline-expressions":129,"./minification/member-expression-literals":130,"./minification/property-literals":131,"./minification/remove-console":132,"./minification/remove-debugger":133,"./optimisation/flow.for-of":134,"./optimisation/react.constant-elements":135,"./optimisation/react.inline-elements":136,"./other/async-to-generator":137,"./other/bluebird-coroutines":138,"./other/flow":139,"./other/jscript":140,"./other/react":142,"./other/react-compat":141,"./other/regenerator":143,"./other/runtime":145,"./other/strict":146,"./spec/block-scoped-functions":147,"./spec/function-name":148,"./spec/proto-to-assign":149,"./spec/undefined-to-void":150,"./utility/inline-environment-variables":151,"./validation/react":152,"./validation/undeclared-variable-check":153}],121:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionSortBy = require("lodash/collection/sortBy");

var _lodashCollectionSortBy2 = _interopRequireDefault(_lodashCollectionSortBy);

var metadata = {
  group: "builtin-trailing"
};

exports.metadata = metadata;
// Priority:
//
//  - 0 We want this to be at the **very** bottom
//  - 1 Default node position
//  - 2 Priority over normal nodes
//  - 3 We want this to be at the **very** top

var BlockStatement = {
  exit: function exit(node) {
    var hasChange = false;
    for (var i = 0; i < node.body.length; i++) {
      var bodyNode = node.body[i];
      if (bodyNode && bodyNode._blockHoist != null) hasChange = true;
    }
    if (!hasChange) return;

    node.body = (0, _lodashCollectionSortBy2["default"])(node.body, function (bodyNode) {
      var priority = bodyNode && bodyNode._blockHoist;
      if (priority == null) priority = 1;
      if (priority === true) priority = 2;

      // Higher priorities should move toward the top.
      return -1 * priority;
    });
  }
};

exports.BlockStatement = BlockStatement;
exports.Program = BlockStatement;
},{"lodash/collection/sortBy":334}],122:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangClone = require("lodash/lang/clone");

var _lodashLangClone2 = _interopRequireDefault(_lodashLangClone);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-setup"
};

exports.metadata = metadata;
function buildClone(bindingKey, refKey) {
  return function (node) {
    if (node[bindingKey] === node[refKey]) {
      node[refKey] = t.removeComments((0, _lodashLangClone2["default"])(node[refKey]));
    }
  };
}

function buildListClone(listKey, bindingKey, refKey) {
  var clone = buildClone(bindingKey, refKey);

  return function (node) {
    if (!node[listKey]) return;

    var _arr = node[listKey];
    for (var _i = 0; _i < _arr.length; _i++) {
      var subNode = _arr[_i];
      clone(subNode);
    }
  };
}

var Property = buildClone("value", "key");
exports.Property = Property;
var ExportDeclaration = buildListClone("specifiers", "local", "exported");
exports.ExportDeclaration = ExportDeclaration;
var ImportDeclaration = buildListClone("specifiers", "local", "imported");
exports.ImportDeclaration = ImportDeclaration;
},{"../../../types":167,"lodash/lang/clone":400}],123:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-setup"
};

exports.metadata = metadata;
var BlockStatement = {
  exit: function exit(node) {
    for (var i = 0; i < node.body.length; i++) {
      var bodyNode = node.body[i];
      if (t.isExpressionStatement(bodyNode) && t.isLiteral(bodyNode.expression)) {
        bodyNode._blockHoist = Infinity;
      } else {
        return;
      }
    }
  }
};

exports.BlockStatement = BlockStatement;
exports.Program = BlockStatement;
},{"../../../types":167}],124:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersStrict = require("../../helpers/strict");

var strict = _interopRequireWildcard(_helpersStrict);

var metadata = {
  group: "builtin-modules"
};

exports.metadata = metadata;
var Program = {
  exit: function exit(program, parent, scope, file) {
    strict.wrap(program, function () {
      // ensure that these are at the top, just like normal imports
      var _arr = file.dynamicImports;
      for (var _i = 0; _i < _arr.length; _i++) {
        var node = _arr[_i];
        node._blockHoist = 3;
      }

      program.body = file.dynamicImports.concat(program.body);
    });

    if (!file.transformers["es6.modules"].canTransform()) return;

    if (file.moduleFormatter.transform) {
      file.moduleFormatter.transform(program);
    }
  }
};
exports.Program = Program;
},{"../../helpers/strict":69}],125:[function(require,module,exports){
// in this transformer we have to split up classes and function declarations
// from their exports. why? because sometimes we need to replace classes with
// nodes that aren't allowed in the same contexts. also, if you're exporting
// a generator function as a default then regenerator will destroy the export
// declaration and leave a variable declaration in it's place... yeah, handy.

"use strict";

exports.__esModule = true;
exports.ImportDeclaration = ImportDeclaration;
exports.ExportDefaultDeclaration = ExportDefaultDeclaration;
exports.ExportNamedDeclaration = ExportNamedDeclaration;
exports.Program = Program;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangClone = require("lodash/lang/clone");

var _lodashLangClone2 = _interopRequireDefault(_lodashLangClone);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-setup"
};

exports.metadata = metadata;

function ImportDeclaration(node, parent, scope, file) {
  if (node.source) {
    node.source.value = file.resolveModuleSource(node.source.value);
  }
}

exports.ExportAllDeclaration = ImportDeclaration;

function ExportDefaultDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function getDeclar() {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export default class Foo {};
    node.declaration = declar.id;
    return [getDeclar(), node];
  } else if (t.isClassExpression(declar)) {
    // export default class {};
    var temp = scope.generateUidIdentifier("default");
    declar = t.variableDeclaration("var", [t.variableDeclarator(temp, declar)]);
    node.declaration = temp;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export default function Foo() {}
    node._blockHoist = 2;
    node.declaration = declar.id;
    return [getDeclar(), node];
  }
}

function buildExportSpecifier(id) {
  return t.exportSpecifier((0, _lodashLangClone2["default"])(id), (0, _lodashLangClone2["default"])(id));
}

function ExportNamedDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function getDeclar() {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export class Foo {}
    node.specifiers = [buildExportSpecifier(declar.id)];
    node.declaration = null;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export function Foo() {}
    node.specifiers = [buildExportSpecifier(declar.id)];
    node.declaration = null;
    node._blockHoist = 2;
    return [getDeclar(), node];
  } else if (t.isVariableDeclaration(declar)) {
    // export var foo = "bar";
    var specifiers = [];
    var bindings = this.get("declaration").getBindingIdentifiers();
    for (var key in bindings) {
      specifiers.push(buildExportSpecifier(bindings[key]));
    }
    return [declar, t.exportNamedDeclaration(null, specifiers)];
  }
}

function Program(node) {
  var imports = [];
  var rest = [];

  for (var i = 0; i < node.body.length; i++) {
    var bodyNode = node.body[i];
    if (t.isImportDeclaration(bodyNode)) {
      imports.push(bodyNode);
    } else {
      rest.push(bodyNode);
    }
  }

  node.body = imports.concat(rest);
}
},{"../../../types":167,"lodash/lang/clone":400}],126:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ThisExpression = ThisExpression;
exports.ReferencedIdentifier = ReferencedIdentifier;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-trailing"
};

exports.metadata = metadata;
function remap(path, key, create) {
  // ensure that we're shadowed
  if (!path.inShadow()) return;

  var fnPath = path.findParent(function (node, path) {
    return !node.shadow && (path.isFunction() || path.isProgram());
  });

  var cached = fnPath.getData(key);
  if (cached) return cached;

  var init = create();
  var id = path.scope.generateUidIdentifier(key);

  fnPath.setData(key, id);
  fnPath.scope.push({ id: id, init: init });

  return id;
}

function ThisExpression() {
  return remap(this, "this", function () {
    return t.thisExpression();
  });
}

function ReferencedIdentifier(node) {
  if (node.name === "arguments" && !node._shadowedFunctionLiteral) {
    return remap(this, "arguments", function () {
      return t.identifier("arguments");
    });
  }
}
},{"../../../types":167}],127:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ForOfStatement = ForOfStatement;
exports.MethodDefinition = MethodDefinition;
exports.Property = Property;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "builtin-setup"
};

exports.metadata = metadata;

function ForOfStatement(node, parent, scope, file) {
  var left = node.left;
  if (t.isVariableDeclaration(left)) {
    var declar = left.declarations[0];
    if (declar.init) throw file.errorWithNode(declar, messages.get("noAssignmentsInForHead"));
  }
}

exports.ForInStatement = ForOfStatement;

function MethodDefinition(node) {
  if (node.kind !== "constructor") {
    // get constructor() {}
    var isConstructor = !node.computed && t.isIdentifier(node.key, { name: "constructor" });

    // get ["constructor"]() {}
    isConstructor = isConstructor || t.isLiteral(node.key, { value: "constructor" });

    if (isConstructor) {
      throw this.errorWithNode(messages.get("classesIllegalConstructorKind"));
    }
  }

  Property.apply(this, arguments);
}

function Property(node, parent, scope, file) {
  if (node.kind === "set") {
    if (node.value.params.length !== 1) {
      throw file.errorWithNode(node.value, messages.get("settersInvalidParamLength"));
    }

    var first = node.value.params[0];
    if (t.isRestElement(first)) {
      throw file.errorWithNode(first, messages.get("settersNoRest"));
    }
  }
}
},{"../../../messages":46,"../../../types":167}],128:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ReferencedIdentifier = ReferencedIdentifier;
exports.FunctionDeclaration = FunctionDeclaration;
exports.VariableDeclarator = VariableDeclarator;
exports.ConditionalExpression = ConditionalExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function toStatements(node) {
  if (t.isBlockStatement(node)) {
    var hasBlockScoped = false;

    for (var i = 0; i < node.body.length; i++) {
      var bodyNode = node.body[i];
      if (t.isBlockScoped(bodyNode)) hasBlockScoped = true;
    }

    if (!hasBlockScoped) {
      return node.body;
    }
  }

  return node;
}

var metadata = {
  optional: true,
  group: "builtin-setup"
};

exports.metadata = metadata;

function ReferencedIdentifier(node, parent, scope) {
  var binding = scope.getBinding(node.name);
  if (!binding || binding.references > 1 || !binding.constant) return;
  if (binding.kind === "param" || binding.kind === "module") return;

  var replacement = binding.path.node;
  if (t.isVariableDeclarator(replacement)) {
    replacement = replacement.init;
  }
  if (!replacement) return;

  t.toExpression(replacement);
  scope.removeBinding(node.name);
  binding.path.remove();
  return replacement;
}

function FunctionDeclaration(node, parent, scope) {
  var bindingInfo = scope.getBinding(node.id.name);
  if (bindingInfo && !bindingInfo.referenced) {
    this.remove();
  }
}

exports.ClassDeclaration = FunctionDeclaration;

function VariableDeclarator(node, parent, scope) {
  if (!t.isIdentifier(node.id) || !scope.isPure(node.init)) return;
  FunctionDeclaration.apply(this, arguments);
}

function ConditionalExpression(node, parent, scope) {
  var evaluateTest = this.get("test").evaluateTruthy();
  if (evaluateTest === true) {
    return node.consequent;
  } else if (evaluateTest === false) {
    return node.alternate;
  }
}

var IfStatement = {
  exit: function exit(node, parent, scope) {
    var consequent = node.consequent;
    var alternate = node.alternate;
    var test = node.test;

    var evaluateTest = this.get("test").evaluateTruthy();

    // we can check if a test will be truthy 100% and if so then we can inline
    // the consequent and completely ignore the alternate
    //
    //   if (true) { foo; } -> { foo; }
    //   if ("foo") { foo; } -> { foo; }
    //

    if (evaluateTest === true) {
      return toStatements(consequent);
    }

    // we can check if a test will be falsy 100% and if so we can inline the
    // alternate if there is one and completely remove the consequent
    //
    //   if ("") { bar; } else { foo; } -> { foo; }
    //   if ("") { bar; } ->
    //

    if (evaluateTest === false) {
      if (alternate) {
        return toStatements(alternate);
      } else {
        return this.remove();
      }
    }

    // remove alternate blocks that are empty
    //
    //   if (foo) { foo; } else {} -> if (foo) { foo; }
    //

    if (t.isBlockStatement(alternate) && !alternate.body.length) {
      alternate = node.alternate = null;
    }

    // if the consequent block is empty turn alternate blocks into a consequent
    // and flip the test
    //
    //   if (foo) {} else { bar; } -> if (!foo) { bar; }
    //

    if (t.isBlockStatement(consequent) && !consequent.body.length && t.isBlockStatement(alternate) && alternate.body.length) {
      node.consequent = node.alternate;
      node.alternate = null;
      node.test = t.unaryExpression("!", test, true);
    }
  }
};
exports.IfStatement = IfStatement;
},{"../../../types":167}],129:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Identifier = Identifier;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-setup"
};

exports.metadata = metadata;
var Expression = {
  exit: function exit(node, parent, scope) {
    var res = this.evaluate();
    if (res.confident) return t.valueToNode(res.value);
  }
};

exports.Expression = Expression;

function Identifier() {}

// override Expression
},{"../../../types":167}],130:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-trailing"
};

exports.metadata = metadata;
var MemberExpression = {
  exit: function exit(node) {
    var prop = node.property;
    if (node.computed && t.isLiteral(prop) && t.isValidIdentifier(prop.value)) {
      // foo["bar"] => foo.bar
      node.property = t.identifier(prop.value);
      node.computed = false;
    }
  }
};
exports.MemberExpression = MemberExpression;
},{"../../../types":167}],131:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-trailing"
};

exports.metadata = metadata;
var Property = {
  exit: function exit(node) {
    var key = node.key;
    if (t.isLiteral(key) && t.isValidIdentifier(key.value)) {
      // "foo": "bar" -> foo: "bar"
      node.key = t.identifier(key.value);
      node.computed = false;
    }
  }
};
exports.Property = Property;
},{"../../../types":167}],132:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.CallExpression = CallExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-setup"
};

exports.metadata = metadata;

function CallExpression(node, parent) {
  if (this.get("callee").matchesPattern("console", true)) {
    if (t.isExpressionStatement(parent)) {
      this.parentPath.remove();
    } else {
      this.remove();
    }
  }
}
},{"../../../types":167}],133:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ExpressionStatement = ExpressionStatement;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-setup"
};

exports.metadata = metadata;

function ExpressionStatement(node) {
  if (this.get("expression").isIdentifier({ name: "debugger" })) {
    this.remove();
  }
}
},{"../../../types":167}],134:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ForOfStatement = ForOfStatement;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _es6ForOf = require("../es6/for-of");

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true
};

exports.metadata = metadata;

function ForOfStatement(node, parent, scope, file) {
  if (this.get("right").isTypeGeneric("Array")) {
    return _es6ForOf._ForOfStatementArray.call(this, node, scope, file);
  }
}
},{"../../../types":167,"../es6/for-of":95}],135:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.JSXElement = JSXElement;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersReact = require("../../helpers/react");

var react = _interopRequireWildcard(_helpersReact);

var metadata = {
  optional: true
};

exports.metadata = metadata;
var immutabilityVisitor = {
  enter: function enter(node, parent, scope, state) {
    var _this = this;

    var stop = function stop() {
      state.isImmutable = false;
      _this.stop();
    };

    if (this.isJSXClosingElement()) {
      this.skip();
      return;
    }

    if (this.isJSXIdentifier({ name: "ref" }) && this.parentPath.isJSXAttribute({ name: node })) {
      return stop();
    }

    if (this.isJSXIdentifier() || this.isIdentifier() || this.isJSXMemberExpression()) {
      return;
    }

    if (!this.isImmutable()) stop();
  }
};

function JSXElement(node, parent, scope, file) {
  if (node._hoisted) return;

  var state = { isImmutable: true };
  this.traverse(immutabilityVisitor, state);

  if (state.isImmutable) {
    this.hoist();
    this.skip();
  }

  node._hoisted = true;
}
},{"../../helpers/react":65}],136:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.JSXElement = JSXElement;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersReact = require("../../helpers/react");

var react = _interopRequireWildcard(_helpersReact);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true
};

exports.metadata = metadata;
function hasRefOrSpread(attrs) {
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i];
    if (t.isJSXSpreadAttribute(attr)) return true;
    if (isJSXAttributeOfName(attr, "ref")) return true;
  }
  return false;
}

function isJSXAttributeOfName(attr, name) {
  return t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: name });
}

function JSXElement(node, parent, scope, file) {
  // filter
  var open = node.openingElement;
  if (hasRefOrSpread(open.attributes)) return;

  // init
  var isComponent = true;
  var props = t.objectExpression([]);
  var obj = t.objectExpression([]);
  var key = t.literal(null);
  var type = open.name;

  if (t.isJSXIdentifier(type) && react.isCompatTag(type.name)) {
    type = t.literal(type.name);
    isComponent = false;
  }

  function pushElemProp(key, value) {
    pushProp(obj.properties, t.identifier(key), value);
  }

  function pushProp(objProps, key, value) {
    objProps.push(t.property("init", key, value));
  }

  // metadata
  pushElemProp("type", type);
  pushElemProp("ref", t.literal(null));

  if (node.children.length) {
    pushProp(props.properties, t.identifier("children"), t.arrayExpression(react.buildChildren(node)));
  }

  // props
  for (var i = 0; i < open.attributes.length; i++) {
    var attr = open.attributes[i];
    if (isJSXAttributeOfName(attr, "key")) {
      key = attr.value;
    } else {
      pushProp(props.properties, attr.name, attr.value || t.identifier("true"));
    }
  }

  if (isComponent) {
    props = t.callExpression(file.addHelper("default-props"), [t.memberExpression(type, t.identifier("defaultProps")), props]);
  }

  pushElemProp("props", props);

  // key
  pushElemProp("key", key);

  return obj;
}
},{"../../../types":167,"../../helpers/react":65}],137:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Func = Func;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersRemapAsyncToGenerator = require("../../helpers/remap-async-to-generator");

var _helpersRemapAsyncToGenerator2 = _interopRequireDefault(_helpersRemapAsyncToGenerator);

var _bluebirdCoroutines = require("./bluebird-coroutines");

exports.manipulateOptions = _bluebirdCoroutines.manipulateOptions;
var metadata = {
  optional: true,
  dependencies: ["es7.asyncFunctions", "es6.classes"]
};

exports.metadata = metadata;

function Func(node, parent, scope, file) {
  if (!node.async || node.generator) return;

  return (0, _helpersRemapAsyncToGenerator2["default"])(node, file.addHelper("async-to-generator"), scope);
}
},{"../../helpers/remap-async-to-generator":67,"./bluebird-coroutines":138}],138:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.manipulateOptions = manipulateOptions;
exports.Func = Func;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersRemapAsyncToGenerator = require("../../helpers/remap-async-to-generator");

var _helpersRemapAsyncToGenerator2 = _interopRequireDefault(_helpersRemapAsyncToGenerator);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function manipulateOptions(opts) {
  opts.blacklist.push("regenerator");
}

var metadata = {
  optional: true,
  dependencies: ["es7.asyncFunctions", "es6.classes"]
};

exports.metadata = metadata;

function Func(node, parent, scope, file) {
  if (!node.async || node.generator) return;

  return (0, _helpersRemapAsyncToGenerator2["default"])(node, t.memberExpression(file.addImport("bluebird", null, "absolute"), t.identifier("coroutine")), scope);
}
},{"../../../types":167,"../../helpers/remap-async-to-generator":67}],139:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Flow = Flow;
exports.ClassProperty = ClassProperty;
exports.Class = Class;
exports.Func = Func;
exports.TypeCastExpression = TypeCastExpression;
exports.ImportDeclaration = ImportDeclaration;
exports.ExportDeclaration = ExportDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function Flow(node) {
  this.remove();
}

function ClassProperty(node) {
  node.typeAnnotation = null;
}

function Class(node) {
  node["implements"] = null;
}

function Func(node) {
  for (var i = 0; i < node.params.length; i++) {
    var param = node.params[i];
    param.optional = false;
  }
}

function TypeCastExpression(node) {
  return node.expression;
}

function ImportDeclaration(node) {
  if (node.isType) this.remove();
}

function ExportDeclaration(node) {
  if (this.get("declaration").isTypeAlias()) this.remove();
}
},{"../../../types":167}],140:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.FunctionExpression = FunctionExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true
};

exports.metadata = metadata;

function FunctionExpression(node, print) {
  if (!node.id) return;
  node._ignoreUserWhitespace = true;

  return t.callExpression(t.functionExpression(null, [], t.blockStatement([t.toStatement(node), t.returnStatement(node.id)])), []);
}
},{"../../../types":167}],141:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.manipulateOptions = manipulateOptions;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersReact = require("../../helpers/react");

var react = _interopRequireWildcard(_helpersReact);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function manipulateOptions(opts) {
  opts.blacklist.push("react");
}

var metadata = {
  optional: true
};

exports.metadata = metadata;
require("../../helpers/build-react-transformer")(exports, {
  pre: function pre(state) {
    state.callee = state.tagExpr;
  },

  post: function post(state) {
    if (react.isCompatTag(state.tagName)) {
      state.call = t.callExpression(t.memberExpression(t.memberExpression(t.identifier("React"), t.identifier("DOM")), state.tagExpr, t.isLiteral(state.tagExpr)), state.args);
    }
  }
});
},{"../../../types":167,"../../helpers/build-react-transformer":58,"../../helpers/react":65}],142:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Program = Program;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _helpersReact = require("../../helpers/react");

var react = _interopRequireWildcard(_helpersReact);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var JSX_ANNOTATION_REGEX = /^\*\s*@jsx\s+([^\s]+)/;

function Program(node, parent, scope, file) {
  var id = file.opts.jsxPragma;

  for (var i = 0; i < file.ast.comments.length; i++) {
    var comment = file.ast.comments[i];
    var matches = JSX_ANNOTATION_REGEX.exec(comment.value);
    if (matches) {
      id = matches[1];
      if (id === "React.DOM") {
        throw file.errorWithNode(comment, "The @jsx React.DOM pragma has been deprecated as of React 0.12");
      } else {
        break;
      }
    }
  }

  file.set("jsxIdentifier", id.split(".").map(t.identifier).reduce(function (object, property) {
    return t.memberExpression(object, property);
  }));
}

require("../../helpers/build-react-transformer")(exports, {
  pre: function pre(state) {
    var tagName = state.tagName;
    var args = state.args;
    if (react.isCompatTag(tagName)) {
      args.push(t.literal(tagName));
    } else {
      args.push(state.tagExpr);
    }
  },

  post: function post(state, file) {
    state.callee = file.get("jsxIdentifier");
  }
});
},{"../../../types":167,"../../helpers/build-react-transformer":58,"../../helpers/react":65}],143:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Program = Program;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _regenerator = require("regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  group: "regenerator"
};

exports.metadata = metadata;

function Program(ast) {
  _regenerator2["default"].transform(ast);
  this.stop();
}
},{"../../../types":167,"regenerator":439}],144:[function(require,module,exports){
module.exports={
  "builtins": {
    "Symbol": "symbol",
    "Promise": "promise",
    "Map": "map",
    "WeakMap": "weak-map",
    "Set": "set",
    "WeakSet": "weak-set"
  },

  "methods": {
    "Array": {
      "concat": "array/concat",
      "copyWithin": "array/copy-within",
      "entries": "array/entries",
      "every": "array/every",
      "fill": "array/fill",
      "filter": "array/filter",
      "findIndex": "array/find-index",
      "find": "array/find",
      "forEach": "array/for-each",
      "from": "array/from",
      "includes": "array/includes",
      "indexOf": "array/index-of",
      "join": "array/join",
      "keys": "array/keys",
      "lastIndexOf": "array/last-index-of",
      "map": "array/map",
      "of": "array/of",
      "pop": "array/pop",
      "push": "array/push",
      "reduceRight": "array/reduce-right",
      "reduce": "array/reduce",
      "reverse": "array/reverse",
      "shift": "array/shift",
      "slice": "array/slice",
      "some": "array/some",
      "sort": "array/sort",
      "splice": "array/splice",
      "turn": "array/turn",
      "unshift": "array/unshift",
      "values": "array/values"
    },

    "Object": {
      "assign": "object/assign",
      "classof": "object/classof",
      "create": "object/create",
      "define": "object/define",
      "defineProperties": "object/define-properties",
      "defineProperty": "object/define-property",
      "entries": "object/entries",
      "freeze": "object/freeze",
      "getOwnPropertyDescriptor": "object/get-own-property-descriptor",
      "getOwnPropertyDescriptors": "object/get-own-property-descriptors",
      "getOwnPropertyNames": "object/get-own-property-names",
      "getOwnPropertySymbols": "object/get-own-property-symbols",
      "getPrototypePf": "object/get-prototype-of",
      "index": "object/index",
      "isExtensible": "object/is-extensible",
      "isFrozen": "object/is-frozen",
      "isObject": "object/is-object",
      "isSealed": "object/is-sealed",
      "is": "object/is",
      "keys": "object/keys",
      "make": "object/make",
      "preventExtensions": "object/prevent-extensions",
      "seal": "object/seal",
      "setPrototypeOf": "object/set-prototype-of",
      "values": "object/values"
    },

    "RegExp": {
      "escape": "regexp/escape"
    },

    "Function": {
      "only": "function/only",
      "part": "function/part"
    },

    "Math": {
      "acosh": "math/acosh",
      "asinh": "math/asinh",
      "atanh": "math/atanh",
      "cbrt": "math/cbrt",
      "clz32": "math/clz32",
      "cosh": "math/cosh",
      "expm1": "math/expm1",
      "fround": "math/fround",
      "hypot": "math/hypot",
      "pot": "math/pot",
      "imul": "math/imul",
      "log10": "math/log10",
      "log1p": "math/log1p",
      "log2": "math/log2",
      "sign": "math/sign",
      "sinh": "math/sinh",
      "tanh": "math/tanh",
      "trunc": "math/trunc"
    },

    "Date": {
      "addLocale": "date/add-locale",
      "formatUTC": "date/format-utc",
      "format": "date/format"
    },

    "Symbol": {
      "for": "symbol/for",
      "hasInstance": "symbol/for-instance",
      "is-concat-spreadable": "symbol/is-concat-spreadable",
      "iterator": "symbol/iterator",
      "keyFor": "symbol/key-for",
      "match": "symbol/match",
      "replace": "symbol/replace",
      "search": "symbol/search",
      "species": "symbol/species",
      "split": "symbol/split",
      "toPrimitive": "symbol/to-primitive",
      "toStringTag": "symbol/to-string-tag",
      "unscopables": "symbol/unscopables"
    },

    "String": {
      "at": "string/at",
      "codePointAt": "string/code-point-at",
      "endsWith": "string/ends-with",
      "escapeHTML": "string/escape-html",
      "fromCodePoint": "string/from-code-point",
      "includes": "string/includes",
      "raw": "string/raw",
      "repeat": "string/repeat",
      "startsWith": "string/starts-with",
      "unescapeHTML": "string/unescape-html"
    },

    "Number": {
      "EPSILON": "number/epsilon",
      "isFinite": "number/is-finite",
      "isInteger": "number/is-integer",
      "isNaN": "number/is-nan",
      "isSafeInteger": "number/is-safe-integer",
      "MAX_SAFE_INTEGER": "number/max-safe-integer",
      "MIN_SAFE_INTEGER": "number/min-safe-integer",
      "parseFloat": "number/parse-float",
      "parseInt": "number/parse-int",
      "random": "number/random"
    },

    "Reflect": {
      "apply": "reflect/apply",
      "construct": "reflect/construct",
      "defineProperty": "reflect/define-property",
      "deleteProperty": "reflect/delete-property",
      "enumerate": "reflect/enumerate",
      "getOwnPropertyDescriptor": "reflect/get-own-property-descriptor",
      "getPrototypeOf": "reflect/get-prototype-of",
      "get": "reflect/get",
      "has": "reflect/has",
      "isExtensible": "reflect/is-extensible",
      "ownKeys": "reflect/own-keys",
      "preventExtensions": "reflect/prevent-extensions",
      "setPrototypeOf": "reflect/set-prototype-of",
      "set": "reflect/set"
    }
  }
}

},{}],145:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.pre = pre;
exports.ReferencedIdentifier = ReferencedIdentifier;
exports.CallExpression = CallExpression;
exports.BinaryExpression = BinaryExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _traversal = require("../../../../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _util = require("../../../../util");

var util = _interopRequireWildcard(_util);

var _lodashObjectHas = require("lodash/object/has");

var _lodashObjectHas2 = _interopRequireDefault(_lodashObjectHas);

var _types = require("../../../../types");

var t = _interopRequireWildcard(_types);

var _definitions = require("./definitions");

var _definitions2 = _interopRequireDefault(_definitions);

var isSymbolIterator = t.buildMatchMemberExpression("Symbol.iterator");

var RUNTIME_MODULE_NAME = "babel-runtime";

var metadata = {
  optional: true,
  group: "builtin-post-modules"
};

exports.metadata = metadata;

function pre(file) {
  file.set("helperGenerator", function (name) {
    return file.addImport("" + RUNTIME_MODULE_NAME + "/helpers/" + name, name, "absoluteDefault");
  });

  file.setDynamic("regeneratorIdentifier", function () {
    return file.addImport("" + RUNTIME_MODULE_NAME + "/regenerator", "regeneratorRuntime", "absoluteDefault");
  });
}

function ReferencedIdentifier(node, parent, scope, file) {
  if (node.name === "regeneratorRuntime") {
    return file.get("regeneratorIdentifier");
  }

  if (t.isMemberExpression(parent)) return;
  if (!(0, _lodashObjectHas2["default"])(_definitions2["default"].builtins, node.name)) return;
  if (scope.getBindingIdentifier(node.name)) return;

  // Symbol() -> _core.Symbol(); new Promise -> new _core.Promise
  var modulePath = _definitions2["default"].builtins[node.name];
  return file.addImport("" + RUNTIME_MODULE_NAME + "/core-js/" + modulePath, node.name, "absoluteDefault");
}

function CallExpression(node, parent, scope, file) {
  // arr[Symbol.iterator]() -> _core.$for.getIterator(arr)

  if (node.arguments.length) return;

  var callee = node.callee;
  if (!t.isMemberExpression(callee)) return;
  if (!callee.computed) return;
  if (!this.get("callee.property").matchesPattern("Symbol.iterator")) return;

  return t.callExpression(file.addImport("" + RUNTIME_MODULE_NAME + "/core-js/get-iterator", "getIterator", "absoluteDefault"), [callee.object]);
}

function BinaryExpression(node, parent, scope, file) {
  // Symbol.iterator in arr -> core.$for.isIterable(arr)

  if (node.operator !== "in") return;
  if (!this.get("left").matchesPattern("Symbol.iterator")) return;

  return t.callExpression(file.addImport("" + RUNTIME_MODULE_NAME + "/core-js/is-iterable", "isIterable", "absoluteDefault"), [node.right]);
}

var MemberExpression = {
  enter: function enter(node, parent, scope, file) {
    // Array.from -> _core.Array.from

    if (!this.isReferenced()) return;

    var obj = node.object;
    var prop = node.property;

    if (!t.isReferenced(obj, node)) return;

    if (node.computed) return;

    if (!(0, _lodashObjectHas2["default"])(_definitions2["default"].methods, obj.name)) return;

    var methods = _definitions2["default"].methods[obj.name];
    if (!(0, _lodashObjectHas2["default"])(methods, prop.name)) return;

    if (scope.getBindingIdentifier(obj.name)) return;

    var modulePath = methods[prop.name];
    return file.addImport("" + RUNTIME_MODULE_NAME + "/core-js/" + modulePath, "" + obj.name + "$" + prop.name, "absoluteDefault");
  },

  exit: function exit(node, parent, scope, file) {
    if (!this.isReferenced()) return;

    var prop = node.property;
    var obj = node.object;

    if (!(0, _lodashObjectHas2["default"])(_definitions2["default"].builtins, obj.name)) return;
    if (scope.getBindingIdentifier(obj.name)) return;

    var modulePath = _definitions2["default"].builtins[obj.name];
    return t.memberExpression(file.addImport("" + RUNTIME_MODULE_NAME + "/core-js/" + modulePath, "" + obj.name, "absoluteDefault"), prop);
  }
};
exports.MemberExpression = MemberExpression;
},{"../../../../traversal":156,"../../../../types":167,"../../../../util":171,"./definitions":144,"lodash/collection/includes":330,"lodash/object/has":418}],146:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.ThisExpression = ThisExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var THIS_BREAK_KEYS = ["FunctionExpression", "FunctionDeclaration", "ClassExpression", "ClassDeclaration"];

var Program = {
  enter: function enter(program, parent, scope, file) {
    var first = program.body[0];

    var directive;
    if (t.isExpressionStatement(first) && t.isLiteral(first.expression, { value: "use strict" })) {
      directive = first;
    } else {
      directive = t.expressionStatement(t.literal("use strict"));
      this.unshiftContainer("body", directive);
      if (first) {
        directive.leadingComments = first.leadingComments;
        first.leadingComments = [];
      }
    }
    directive._blockHoist = Infinity;
  }
};

exports.Program = Program;

function ThisExpression() {
  if (!this.findParent(function (node) {
    return !node.shadow && THIS_BREAK_KEYS.indexOf(node.type) >= 0;
  })) {
    return t.identifier("undefined");
  }
}
},{"../../../messages":46,"../../../types":167}],147:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.BlockStatement = BlockStatement;
exports.SwitchCase = SwitchCase;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

function statementList(key, path, file) {
  var paths = path.get(key);

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];

    var func = path.node;
    if (!t.isFunctionDeclaration(func)) continue;

    var declar = t.variableDeclaration("let", [t.variableDeclarator(func.id, t.toExpression(func))]);

    // hoist it up above everything else
    declar._blockHoist = 2;

    // todo: name this
    func.id = null;

    path.replaceWith(declar);
  }
}

function BlockStatement(node, parent, scope, file) {
  if (t.isFunction(parent) && parent.body === node || t.isExportDeclaration(parent)) {
    return;
  }

  statementList("body", this, file);
}

function SwitchCase(node, parent, scope, file) {
  statementList("consequent", this, file);
}
},{"../../../types":167}],148:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _helpersNameMethod = require("../../helpers/name-method");

var metadata = {
  group: "builtin-setup"
};

exports.metadata = metadata;
var FunctionExpression = {
  exit: _helpersNameMethod.bare
};

exports.FunctionExpression = FunctionExpression;
exports.ArrowFunctionExpression = FunctionExpression;
},{"../../helpers/name-method":64}],149:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.AssignmentExpression = AssignmentExpression;
exports.ExpressionStatement = ExpressionStatement;
exports.ObjectExpression = ObjectExpression;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var _lodashArrayPull = require("lodash/array/pull");

var _lodashArrayPull2 = _interopRequireDefault(_lodashArrayPull);

function isProtoKey(node) {
  return t.isLiteral(t.toComputedKey(node, node.key), { value: "__proto__" });
}

function isProtoAssignmentExpression(node) {
  var left = node.left;
  return t.isMemberExpression(left) && t.isLiteral(t.toComputedKey(left, left.property), { value: "__proto__" });
}

function buildDefaultsCallExpression(expr, ref, file) {
  return t.expressionStatement(t.callExpression(file.addHelper("defaults"), [ref, expr.right]));
}

var metadata = {
  secondPass: true,
  optional: true
};

exports.metadata = metadata;

function AssignmentExpression(node, parent, scope, file) {
  if (!isProtoAssignmentExpression(node)) return;

  var nodes = [];
  var left = node.left.object;
  var temp = scope.generateMemoisedReference(left);

  nodes.push(t.expressionStatement(t.assignmentExpression("=", temp, left)));
  nodes.push(buildDefaultsCallExpression(node, temp, file));
  if (temp) nodes.push(temp);

  return nodes;
}

function ExpressionStatement(node, parent, scope, file) {
  var expr = node.expression;
  if (!t.isAssignmentExpression(expr, { operator: "=" })) return;

  if (isProtoAssignmentExpression(expr)) {
    return buildDefaultsCallExpression(expr, expr.left.object, file);
  }
}

function ObjectExpression(node, parent, scope, file) {
  var proto;

  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];

    if (isProtoKey(prop)) {
      proto = prop.value;
      (0, _lodashArrayPull2["default"])(node.properties, prop);
    }
  }

  if (proto) {
    var args = [t.objectExpression([]), proto];
    if (node.properties.length) args.push(node);
    return t.callExpression(file.addHelper("extends"), args);
  }
}
},{"../../../types":167,"lodash/array/pull":325}],150:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Identifier = Identifier;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  react: true
};

exports.metadata = metadata;

function Identifier(node, parent) {
  if (node.name === "undefined" && this.isReferenced()) {
    return t.unaryExpression("void", t.literal(0), true);
  }
}
},{"../../../types":167}],151:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
exports.MemberExpression = MemberExpression;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

var metadata = {
  optional: true,
  group: "builtin-setup"
};

exports.metadata = metadata;
var match = t.buildMatchMemberExpression("process.env");

function MemberExpression(node) {
  if (match(node.object)) {
    var key = this.toComputedKey();
    if (t.isLiteral(key)) {
      return t.valueToNode(process.env[key.value]);
    }
  }
}
}).call(this,require('_process'))
},{"../../../types":167,"_process":198}],152:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.CallExpression = CallExpression;
exports.ModuleDeclaration = ModuleDeclaration;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../../../types");

var t = _interopRequireWildcard(_types);

// check if the input Literal `source` is an alternate casing of "react"
function check(source, file) {
  if (t.isLiteral(source)) {
    var name = source.value;
    var lower = name.toLowerCase();

    if (lower === "react" && name !== lower) {
      throw file.errorWithNode(source, messages.get("didYouMean", "react"));
    }
  }
}

function CallExpression(node, parent, scope, file) {
  if (this.get("callee").isIdentifier({ name: "require" }) && node.arguments.length === 1) {
    check(node.arguments[0], file);
  }
}

function ModuleDeclaration(node, parent, scope, file) {
  check(node.source, file);
}
},{"../../../messages":46,"../../../types":167}],153:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.Identifier = Identifier;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _leven = require("leven");

var _leven2 = _interopRequireDefault(_leven);

var _messages = require("../../../messages");

var messages = _interopRequireWildcard(_messages);

var metadata = {
  optional: true
};

exports.metadata = metadata;

function Identifier(node, parent, scope, file) {
  if (!this.isReferenced()) return;
  if (scope.hasBinding(node.name)) return;

  // get the closest declaration to offer as a suggestion
  // the variable name may have just been mistyped

  var bindings = scope.getAllBindings();

  var closest;
  var shortest = -1;

  for (var name in bindings) {
    var distance = (0, _leven2["default"])(node.name, name);
    if (distance <= 0 || distance > 3) continue;
    if (distance <= shortest) continue;

    closest = name;
    shortest = distance;
  }

  var msg;
  if (closest) {
    msg = messages.get("undeclaredVariableSuggestion", node.name, closest);
  } else {
    msg = messages.get("undeclaredVariable", node.name);
  }

  //

  throw file.errorWithNode(node, msg, ReferenceError);
}
},{"../../../messages":46,"leven":319}],154:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var Binding = (function () {
  function Binding(_ref) {
    var identifier = _ref.identifier;
    var scope = _ref.scope;
    var path = _ref.path;
    var kind = _ref.kind;

    _classCallCheck(this, Binding);

    this.identifier = identifier;
    this.references = 0;
    this.referenced = false;
    this.constant = true;
    this.scope = scope;
    this.path = path;
    this.kind = kind;
  }

  /**
   * Description
   */

  Binding.prototype.setTypeAnnotation = function setTypeAnnotation() {
    var typeInfo = this.path.getTypeAnnotation();
    this.typeAnnotationInferred = typeInfo.inferred;
    this.typeAnnotation = typeInfo.annotation;
  };

  /**
   * Description
   */

  Binding.prototype.isTypeGeneric = function isTypeGeneric() {
    var _path;

    return (_path = this.path).isTypeGeneric.apply(_path, arguments);
  };

  /**
   * Description
   */

  Binding.prototype.assignTypeGeneric = function assignTypeGeneric(type, params) {
    var typeParams = null;
    if (params) params = t.typeParameterInstantiation(params);
    this.assignType(t.genericTypeAnnotation(t.identifier(type), typeParams));
  };

  /**
   * Description
   */

  Binding.prototype.assignType = function assignType(type) {
    this.typeAnnotation = type;
  };

  /**
   * Description
   */

  Binding.prototype.reassign = function reassign() {
    this.constant = false;

    if (this.typeAnnotationInferred) {
      // destroy the inferred typeAnnotation
      this.typeAnnotation = null;
    }
  };

  /**
   * Description
   */

  Binding.prototype.reference = function reference() {
    this.referenced = true;
    this.references++;
  };

  /**
   * Description
   */

  Binding.prototype.dereference = function dereference() {
    this.references--;
    this.referenced = !!this.references;
  };

  /**
   * Description
   */

  Binding.prototype.isCompatibleWithType = function isCompatibleWithType(newType) {
    return false;
  };

  return Binding;
})();

exports["default"] = Binding;
module.exports = exports["default"];
},{"../types":167}],155:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _path = require("./path");

var _path2 = _interopRequireDefault(_path);

var _lodashArrayCompact = require("lodash/array/compact");

var _lodashArrayCompact2 = _interopRequireDefault(_lodashArrayCompact);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var TraversalContext = (function () {
  function TraversalContext(scope, opts, state, parentPath) {
    _classCallCheck(this, TraversalContext);

    this.parentPath = parentPath;
    this.scope = scope;
    this.state = state;
    this.opts = opts;
  }

  TraversalContext.prototype.shouldVisit = function shouldVisit(node) {
    var keys = t.VISITOR_KEYS[node.type];
    return !!(this.opts.enter || this.opts.exit || this.opts[node.type] || keys && keys.length);
  };

  TraversalContext.prototype.create = function create(node, obj, key) {
    return _path2["default"].get(this.parentPath, this, node, obj, key);
  };

  TraversalContext.prototype.visitMultiple = function visitMultiple(nodes, node, key) {
    // nothing to traverse!
    if (nodes.length === 0) return false;

    var visited = [];

    var queue = this.queue = [];
    var stop = false;

    // build up initial queue
    for (var i = 0; i < nodes.length; i++) {
      var self = nodes[i];
      if (self && this.shouldVisit(self)) {
        queue.push(this.create(node, nodes, i));
      }
    }

    // visit the queue
    for (var i = 0; i < queue.length; i++) {
      var path = queue[i];
      if (visited.indexOf(path.node) >= 0) continue;
      visited.push(path.node);

      path.setContext(this.parentPath, this, path.key);

      if (path.visit()) {
        stop = true;
        break;
      }
    }

    return stop;
  };

  TraversalContext.prototype.visitSingle = function visitSingle(node, key) {
    if (this.shouldVisit(node[key])) {
      return this.create(node, node, key).visit();
    }
  };

  TraversalContext.prototype.visit = function visit(node, key) {
    var nodes = node[key];
    if (!nodes) return;

    if (Array.isArray(nodes)) {
      return this.visitMultiple(nodes, node, key);
    } else {
      return this.visitSingle(node, key);
    }
  };

  return TraversalContext;
})();

exports["default"] = TraversalContext;
module.exports = exports["default"];
},{"../types":167,"./path":160,"lodash/array/compact":322}],156:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = traverse;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _context = require("./context");

var _context2 = _interopRequireDefault(_context);

var _visitors = require("./visitors");

var visitors = _interopRequireWildcard(_visitors);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

function traverse(parent, opts, scope, state, parentPath) {
  if (!parent) return;

  if (!opts.noScope && !scope) {
    if (parent.type !== "Program" && parent.type !== "File") {
      throw new Error(messages.get("traverseNeedsParent", parent.type));
    }
  }

  if (!opts) opts = {};

  visitors.verify(opts);
  visitors.explode(opts);

  // array of nodes
  if (Array.isArray(parent)) {
    for (var i = 0; i < parent.length; i++) {
      traverse.node(parent[i], opts, scope, state, parentPath);
    }
  } else {
    traverse.node(parent, opts, scope, state, parentPath);
  }
}

traverse.visitors = visitors;
traverse.verify = visitors.verify;
traverse.explode = visitors.explode;

traverse.node = function (node, opts, scope, state, parentPath) {
  var keys = t.VISITOR_KEYS[node.type];
  if (!keys) return;

  var context = new _context2["default"](scope, opts, state, parentPath);
  for (var i = 0; i < keys.length; i++) {
    if (context.visit(node, keys[i])) {
      return;
    }
  }
};

var CLEAR_KEYS = ["trailingComments", "leadingComments", "extendedRange", "_scopeInfo", "_paths", "tokens", "range", "start", "end", "loc", "raw"];

function clearNode(node) {
  for (var i = 0; i < CLEAR_KEYS.length; i++) {
    var key = CLEAR_KEYS[i];
    if (node[key] != null) node[key] = null;
  }

  for (var key in node) {
    var val = node[key];
    if (Array.isArray(val)) {
      delete val._paths;
    }
  }
}

var clearVisitor = {
  noScope: true,
  exit: clearNode
};

function clearComments(comments) {
  for (var i = 0; i < comments.length; i++) {
    clearNode(comments[i]);
  }
}

traverse.removeProperties = function (tree) {
  traverse(tree, clearVisitor);
  clearNode(tree);

  return tree;
};

function hasBlacklistedType(node, parent, scope, state) {
  if (node.type === state.type) {
    state.has = true;
    this.skip();
  }
}

traverse.hasType = function (tree, scope, type, blacklistTypes) {
  // the node we're searching in is blacklisted
  if ((0, _lodashCollectionIncludes2["default"])(blacklistTypes, tree.type)) return false;

  // the type we're looking for is the same as the passed node
  if (tree.type === type) return true;

  var state = {
    has: false,
    type: type
  };

  traverse(tree, {
    blacklist: blacklistTypes,
    enter: hasBlacklistedType
  }, scope, state);

  return state.has;
};
module.exports = exports["default"];
},{"../messages":46,"../types":167,"./context":155,"./visitors":163,"lodash/collection/includes":330}],157:[function(require,module,exports){
"use strict";

exports.__esModule = true;

/**
 * Description
 */

exports.toComputedKey = toComputedKey;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

function toComputedKey() {
  var node = this.node;

  var key;
  if (this.isMemberExpression()) {
    key = node.property;
  } else if (this.isProperty()) {
    key = node.key;
  } else {
    throw new ReferenceError("todo");
  }

  if (!node.computed) {
    if (t.isIdentifier(key)) key = t.literal(key.name);
  }

  return key;
}
},{"../../types":167}],158:[function(require,module,exports){
"use strict";

exports.__esModule = true;
/**
 * Walk the input `node` and statically evaluate if it's truthy.
 *
 * Returning `true` when we're sure that the expression will evaluate to a
 * truthy value, `false` if we're sure that it will evaluate to a falsy
 * value and `undefined` if we aren't sure. Because of this please do not
 * rely on coercion when using this method and check with === if it's false.
 *
 * For example do:
 *
 *   if (t.evaluateTruthy(node) === false) falsyLogic();
 *
 * **AND NOT**
 *
 *   if (!t.evaluateTruthy(node)) falsyLogic();
 *
 */

exports.evaluateTruthy = evaluateTruthy;

/**
 * Walk the input `node` and statically evaluate it.
 *
 * Returns an object in the form `{ confident, value }`. `confident` indicates
 * whether or not we had to drop out of evaluating the expression because of
 * hitting an unknown node that we couldn't confidently find the value of.
 *
 * Example:
 *
 *   t.evaluate(parse("5 + 5")) // { confident: true, value: 10 }
 *   t.evaluate(parse("!true")) // { confident: true, value: false }
 *   t.evaluate(parse("foo + foo")) // { confident: false, value: undefined }
 *
 */

exports.evaluate = evaluate;

function evaluateTruthy() {
  var res = this.evaluate();
  if (res.confident) return !!res.value;
}

function evaluate() {
  var confident = true;

  var value = evaluate(this);
  if (!confident) value = undefined;
  return {
    confident: confident,
    value: value
  };

  function evaluate(path) {
    if (!confident) return;

    var node = path.node;

    if (path.isSequenceExpression()) {
      var exprs = path.get("expressions");
      return evaluate(exprs[exprs.length - 1]);
    }

    if (path.isLiteral()) {
      if (node.regex) {} else {
        return node.value;
      }
    }

    if (path.isConditionalExpression()) {
      if (evaluate(path.get("test"))) {
        return evaluate(path.get("consequent"));
      } else {
        return evaluate(path.get("alternate"));
      }
    }

    if (path.isIdentifier({ name: "undefined" })) {
      return undefined;
    }

    if (path.isIdentifier() || path.isMemberExpression()) {
      path = path.resolve();
      if (path) {
        return evaluate(path);
      } else {
        return confident = false;
      }
    }

    if (path.isUnaryExpression({ prefix: true })) {
      var arg = evaluate(path.get("argument"));
      switch (node.operator) {
        case "void":
          return undefined;
        case "!":
          return !arg;
        case "+":
          return +arg;
        case "-":
          return -arg;
        case "~":
          return ~arg;
      }
    }

    if (path.isArrayExpression() || path.isObjectExpression()) {}

    if (path.isLogicalExpression()) {
      var left = evaluate(path.get("left"));
      var right = evaluate(path.get("right"));

      switch (node.operator) {
        case "||":
          return left || right;
        case "&&":
          return left && right;
      }
    }

    if (path.isBinaryExpression()) {
      var left = evaluate(path.get("left"));
      var right = evaluate(path.get("right"));

      switch (node.operator) {
        case "-":
          return left - right;
        case "+":
          return left + right;
        case "/":
          return left / right;
        case "*":
          return left * right;
        case "%":
          return left % right;
        case "<":
          return left < right;
        case ">":
          return left > right;
        case "<=":
          return left <= right;
        case ">=":
          return left >= right;
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case "===":
          return left === right;
        case "!==":
          return left !== right;
      }
    }

    confident = false;
  }
}

// we have a regex and we can't represent it natively

// we could evaluate these but it's probably impractical and not very useful
},{}],159:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _transformationHelpersReact = require("../../transformation/helpers/react");

var react = _interopRequireWildcard(_transformationHelpersReact);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var referenceVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (this.isJSXIdentifier() && react.isCompatTag(node.name)) {
      return;
    }

    if (this.isJSXIdentifier() || this.isIdentifier()) {
      // direct references that we need to track to hoist this to the highest scope we can
      if (this.isReferenced()) {
        var bindingInfo = scope.getBinding(node.name);

        // this binding isn't accessible from the parent scope so we can safely ignore it
        // eg. it's in a closure etc
        if (bindingInfo !== state.scope.getBinding(node.name)) return;

        if (bindingInfo) {
          if (bindingInfo.constant) {
            state.bindings[node.name] = bindingInfo;
          } else {
            state.foundIncompatible = true;
            this.stop();
          }
        }
      }
    }
  }
};

var PathHoister = (function () {
  function PathHoister(path, scope) {
    _classCallCheck(this, PathHoister);

    this.foundIncompatible = false;
    this.bindings = {};
    this.scope = scope;
    this.scopes = [];
    this.path = path;
  }

  PathHoister.prototype.isCompatibleScope = function isCompatibleScope(scope) {
    for (var key in this.bindings) {
      var binding = this.bindings[key];
      if (!scope.bindingIdentifierEquals(key, binding.identifier)) {
        return false;
      }
    }
    return true;
  };

  PathHoister.prototype.getCompatibleScopes = function getCompatibleScopes() {
    var checkScope = this.path.scope;
    do {
      if (this.isCompatibleScope(checkScope)) {
        this.scopes.push(checkScope);
      } else {
        break;
      }
    } while (checkScope = checkScope.parent);
  };

  PathHoister.prototype.getAttachmentPath = function getAttachmentPath() {
    var scopes = this.scopes;

    var scope = scopes.pop();

    if (scope.path.isFunction()) {
      if (this.hasNonParamBindings()) {
        // can't be attached to this scope
        return this.getNextScopeStatementParent();
      } else {
        // needs to be attached to the body
        return scope.path.get("body").get("body")[0];
      }
    } else if (scope.path.isProgram()) {
      return this.getNextScopeStatementParent();
    }
  };

  PathHoister.prototype.getNextScopeStatementParent = function getNextScopeStatementParent() {
    var scope = this.scopes.pop();
    if (scope) return scope.path.getStatementParent();
  };

  PathHoister.prototype.hasNonParamBindings = function hasNonParamBindings() {
    for (var name in this.bindings) {
      var binding = this.bindings[name];
      if (binding.kind !== "param") return true;
    }
    return false;
  };

  PathHoister.prototype.run = function run() {
    var node = this.path.node;
    if (node._hoisted) return;
    node._hoisted = true;

    this.path.traverse(referenceVisitor, this);
    if (this.foundIncompatible) return;

    this.getCompatibleScopes();

    var path = this.getAttachmentPath();
    if (!path) return;

    var uid = path.scope.generateUidIdentifier("ref");

    path.insertBefore([t.variableDeclaration("var", [t.variableDeclarator(uid, this.path.node)])]);

    var parent = this.path.parentPath;

    if (parent.isJSXElement() && this.path.container === parent.node.children) {
      // turning the `span` in `<div><span /></div>` to an expression so we need to wrap it with
      // an expression container
      uid = t.jSXExpressionContainer(uid);
    }

    this.path.replaceWith(uid);
  };

  return PathHoister;
})();

exports["default"] = PathHoister;
module.exports = exports["default"];
},{"../../transformation/helpers/react":65,"../../types":167}],160:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _hoister = require("./hoister");

var _hoister2 = _interopRequireDefault(_hoister);

var _virtualTypes = require("./virtual-types");

var virtualTypes = _interopRequireWildcard(_virtualTypes);

var _lodashLangIsBoolean = require("lodash/lang/isBoolean");

var _lodashLangIsBoolean2 = _interopRequireDefault(_lodashLangIsBoolean);

var _lodashLangIsNumber = require("lodash/lang/isNumber");

var _lodashLangIsNumber2 = _interopRequireDefault(_lodashLangIsNumber);

var _lodashLangIsRegExp = require("lodash/lang/isRegExp");

var _lodashLangIsRegExp2 = _interopRequireDefault(_lodashLangIsRegExp);

var _lodashLangIsString = require("lodash/lang/isString");

var _lodashLangIsString2 = _interopRequireDefault(_lodashLangIsString);

var _helpersCodeFrame = require("../../helpers/code-frame");

var _helpersCodeFrame2 = _interopRequireDefault(_helpersCodeFrame);

var _helpersParse = require("../../helpers/parse");

var _helpersParse2 = _interopRequireDefault(_helpersParse);

var _visitors = require("../visitors");

var _index = require("../index");

var _index2 = _interopRequireDefault(_index);

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _lodashObjectAssign = require("lodash/object/assign");

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

var _scope = require("../scope");

var _scope2 = _interopRequireDefault(_scope);

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var hoistVariablesVisitor = (0, _visitors.explode)({
  Function: function Function() {
    this.skip();
  },

  VariableDeclaration: function VariableDeclaration(node, parent, scope) {
    if (node.kind !== "var") return;

    var bindings = this.getBindingIdentifiers();
    for (var key in bindings) {
      scope.push({ id: bindings[key] });
    }

    var exprs = [];

    var _arr = node.declarations;
    for (var _i = 0; _i < _arr.length; _i++) {
      var declar = _arr[_i];
      var declar = node.declarations[i];
      if (declar.init) {
        exprs.push(t.expressionStatement(t.assignmentExpression("=", declar.id, declar.init)));
      }
    }

    return exprs;
  }
});

var TraversalPath = (function () {
  function TraversalPath(parent, container) {
    _classCallCheck(this, TraversalPath);

    this.container = container;
    this.parent = parent;
    this.data = {};
  }

  /**
   * Description
   */

  TraversalPath.get = function get(parentPath, context, parent, container, key, file) {
    var targetNode = container[key];
    var paths = container._paths = container._paths || [];
    var path;

    for (var i = 0; i < paths.length; i++) {
      var pathCheck = paths[i];
      if (pathCheck.node === targetNode) {
        path = pathCheck;
        break;
      }
    }

    if (!path) {
      path = new TraversalPath(parent, container);
      paths.push(path);
    }

    path.setContext(parentPath, context, key, file);

    return path;
  };

  /**
   * Description
   */

  TraversalPath.getScope = function getScope(path, scope, file) {
    var ourScope = scope;

    // we're entering a new scope so let's construct it!
    if (path.isScope()) {
      ourScope = new _scope2["default"](path, scope, file);
    }

    return ourScope;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getAncestry = function getAncestry() {
    var ancestry = [];

    var path = this.parentPath;
    while (path) {
      ancestry.push(path.node);
      path = path.parentPath;
    }

    return ancestry;
  };

  /**
   * Description
   */

  TraversalPath.prototype.inType = function inType(types) {
    if (!Array.isArray(types)) types = [types];

    var path = this;
    while (path) {
      var _arr3 = types;

      for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
        var type = _arr3[_i3];
        if (path.node.type === type) return true;
      }
      path = path.parentPath;
    }

    return false;
  };

  /**
   * Description
   */

  TraversalPath.prototype.inShadow = function inShadow() {
    var path = this;
    while (path) {
      if (path.isFunction()) {
        if (path.node.shadow) {
          return path;
        } else {
          return null;
        }
      }
      path = path.parentPath;
    }
    return null;
  };

  /**
   * Check whether this node was a part of the original AST.
   */

  TraversalPath.prototype.isUser = function isUser() {
    return this.node && !!this.node.loc;
  };

  /**
   * Check whether this node was generated by us and not a part of the original AST.
   */

  TraversalPath.prototype.isGenerated = function isGenerated() {
    return !this.isUser();
  };

  /**
   * Description
   */

  TraversalPath.prototype.findParent = function findParent(callback) {
    var path = this;
    while (path) {
      if (callback(path.node, path)) return path;
      path = path.parentPath;
    }
    return null;
  };

  /**
   * Description
   */

  TraversalPath.prototype.queueNode = function queueNode(path) {
    if (this.context && this.context.queue) {
      this.context.queue.push(path);
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.insertBefore = function insertBefore(nodes) {
    nodes = this._verifyNodeList(nodes);

    if (this.parentPath.isExpressionStatement() || this.parentPath.isLabeledStatement()) {
      return this.parentPath.insertBefore(nodes);
    } else if (this.isPreviousType("Expression") || this.parentPath.isForStatement() && this.key === "init") {
      if (this.node) nodes.push(this.node);
      this.replaceExpressionWithStatements(nodes);
    } else if (this.isPreviousType("Statement") || !this.type) {
      this._maybePopFromStatements(nodes);
      if (Array.isArray(this.container)) {
        this._containerInsertBefore(nodes);
      } else if (this.isStatementOrBlock()) {
        if (this.node) nodes.push(this.node);
        this.container[this.key] = t.blockStatement(nodes);
      } else {
        throw new Error("We don't know what to do with this node type. We were previously a Statement but we can't fit in here?");
      }
    } else {
      throw new Error("No clue what to do with this node type.");
    }
  };

  TraversalPath.prototype._containerInsert = function _containerInsert(from, nodes) {
    this.updateSiblingKeys(from, nodes.length);

    var paths = [];

    for (var i = 0; i < nodes.length; i++) {
      var to = from + i;
      var node = nodes[i];
      this.container.splice(to, 0, node);

      if (this.context) {
        var path = this.context.create(this.parent, this.container, to);
        paths.push(path);
        this.queueNode(path);
      } else {
        paths.push(TraversalPath.get(this, null, node, this.container, to));
      }
    }

    return paths;
  };

  TraversalPath.prototype._containerInsertBefore = function _containerInsertBefore(nodes) {
    return this._containerInsert(this.key, nodes);
  };

  TraversalPath.prototype._containerInsertAfter = function _containerInsertAfter(nodes) {
    return this._containerInsert(this.key + 1, nodes);
  };

  TraversalPath.prototype._maybePopFromStatements = function _maybePopFromStatements(nodes) {
    var last = nodes[nodes.length - 1];
    if (t.isExpressionStatement(last) && t.isIdentifier(last.expression) && !this.isCompletionRecord()) {
      nodes.pop();
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.isCompletionRecord = function isCompletionRecord() {
    var path = this;

    do {
      var container = path.container;
      if (Array.isArray(container) && path.key !== container.length - 1) {
        return false;
      }
    } while (path = path.parentPath && !path.isProgram());

    return true;
  };

  /**
   * Description
   */

  TraversalPath.prototype.isStatementOrBlock = function isStatementOrBlock() {
    if (t.isLabeledStatement(this.parent) || t.isBlockStatement(this.container)) {
      return false;
    } else {
      return (0, _lodashCollectionIncludes2["default"])(t.STATEMENT_OR_BLOCK_KEYS, this.key);
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.insertAfter = function insertAfter(nodes) {
    nodes = this._verifyNodeList(nodes);

    if (this.parentPath.isExpressionStatement() || this.parentPath.isLabeledStatement()) {
      return this.parentPath.insertAfter(nodes);
    } else if (this.isPreviousType("Expression") || this.parentPath.isForStatement() && this.key === "init") {
      if (this.node) {
        var temp = this.scope.generateTemp();
        nodes.unshift(t.expressionStatement(t.assignmentExpression("=", temp, this.node)));
        nodes.push(t.expressionStatement(temp));
      }
      this.replaceExpressionWithStatements(nodes);
    } else if (this.isPreviousType("Statement") || !this.type) {
      this._maybePopFromStatements(nodes);
      if (Array.isArray(this.container)) {
        this._containerInsertAfter(nodes);
      } else if (this.isStatementOrBlock()) {
        if (this.node) nodes.unshift(this.node);
        this.container[this.key] = t.blockStatement(nodes);
      } else {
        throw new Error("We don't know what to do with this node type. We were previously a Statement but we can't fit in here?");
      }
    } else {
      throw new Error("No clue what to do with this node type.");
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.updateSiblingKeys = function updateSiblingKeys(fromIndex, incrementBy) {
    var paths = this.container._paths;
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      if (path.key >= fromIndex) {
        path.key += incrementBy;
      }
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.setData = function setData(key, val) {
    return this.data[key] = val;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getData = function getData(key, def) {
    var val = this.data[key];
    if (!val && def) val = this.data[key] = def;
    return val;
  };

  /**
   * Description
   */

  TraversalPath.prototype.setScope = function setScope(file) {
    var target = this.context || this.parentPath;
    this.scope = TraversalPath.getScope(this, target && target.scope, file);
  };

  /**
   * Description
   */

  TraversalPath.prototype.clearContext = function clearContext() {
    this.context = null;
  };

  /**
   * Description
   */

  TraversalPath.prototype.setContext = function setContext(parentPath, context, key, file) {
    this.shouldSkip = false;
    this.shouldStop = false;
    this.removed = false;

    this.parentPath = parentPath || this.parentPath;
    this.key = key;

    if (context) {
      this.context = context;
      this.state = context.state;
      this.opts = context.opts;
    }

    this.type = this.node && this.node.type;

    var log = file && this.type === "Program";
    if (log) file.log.debug("Start scope building");
    this.setScope(file);
    if (log) file.log.debug("End scope building");
  };

  /**
   * Share comments amongst siblings.
   */

  TraversalPath.prototype.shareCommentsWithSiblings = function shareCommentsWithSiblings() {
    var node = this.node;
    if (!node) return;

    var trailing = node.trailingComments;
    var leading = node.leadingComments;
    if (!trailing && !leading) return;

    var prev = this.getSibling(this.key - 1);
    var next = this.getSibling(this.key + 1);

    if (!prev.node) prev = next;
    if (!next.node) next = prev;

    prev.giveComments("trailing", leading);
    next.giveComments("leading", trailing);
  };

  /**
   * Give node `comments` of the specified `type`.
   */

  TraversalPath.prototype.giveComments = function giveComments(type, comments) {
    if (!comments) return;

    var node = this.node;
    if (!node) return;

    var key = "" + type + "Comments";

    if (node[key]) {
      node[key] = node[key].concat(comments);
    } else {
      node[key] = comments;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.remove = function remove() {
    this.shareCommentsWithSiblings();
    this._remove();
    this.removed = true;

    var parentPath = this.parentPath;
    var parent = this.parent;
    if (!parentPath) return;

    // we've just removed the last declarator of a variable declaration so there's no point in
    // keeping it
    if (parentPath.isVariableDeclaration() && parent.declarations.length === 0) {
      return parentPath.remove();
    }

    // we're the child of an expression statement so we should remove the parent
    if (parentPath.isExpressionStatement()) {
      return parentPath.remove();
    }

    // we've just removed the second element of a sequence expression so let's turn that sequence
    // expression into a regular expression
    if (parentPath.isSequenceExpression() && parent.expressions.length === 1) {
      parentPath.replaceWith(parent.expressions[0]);
    }

    // we're in a binary expression, better remove it and replace it with the last expression
    if (parentPath.isBinary()) {
      if (this.key === "left") {
        parentPath.replaceWith(parent.right);
      } else {
        // key === "right"
        parentPath.replaceWith(parent.left);
      }
    }
  };

  TraversalPath.prototype._remove = function _remove() {
    if (Array.isArray(this.container)) {
      this.container.splice(this.key, 1);
      this.updateSiblingKeys(this.key, -1);
    } else {
      this.container[this.key] = null;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.skip = function skip() {
    this.shouldSkip = true;
  };

  /**
   * Description
   */

  TraversalPath.prototype.stop = function stop() {
    this.shouldStop = true;
    this.shouldSkip = true;
  };

  /**
   * Description
   */

  TraversalPath.prototype.errorWithNode = function errorWithNode(msg) {
    var Error = arguments[1] === undefined ? SyntaxError : arguments[1];

    var loc = this.node.loc.start;
    var err = new Error("Line " + loc.line + ": " + msg);
    err.loc = loc;
    return err;
  };

  /**
   * Description
   */

  TraversalPath.prototype.replaceInline = function replaceInline(nodes) {
    if (Array.isArray(nodes)) {
      if (Array.isArray(this.container)) {
        nodes = this._verifyNodeList(nodes);
        this._containerInsertAfter(nodes);
        return this.remove();
      } else {
        return this.replaceWithMultiple(nodes);
      }
    } else {
      return this.replaceWith(nodes);
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype._verifyNodeList = function _verifyNodeList(nodes) {
    if (nodes.constructor !== Array) {
      nodes = [nodes];
    }

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node) {
        throw new Error("Node list has falsy node with the index of " + i);
      } else if (typeof node !== "object") {
        throw new Error("Node list contains a non-object node with the index of " + i);
      } else if (!node.type) {
        throw new Error("Node list contains a node without a type with the index of " + i);
      }
    }

    return nodes;
  };

  /**
   * Description
   */

  TraversalPath.prototype.unshiftContainer = function unshiftContainer(containerKey, nodes) {
    nodes = this._verifyNodeList(nodes);

    // get the first path and insert our nodes before it, if it doesn't exist then it
    // doesn't matter, our nodes will be inserted anyway

    var container = this.node[containerKey];
    var path = TraversalPath.get(this, null, this.node, container, 0);

    return path.insertBefore(nodes);
  };

  /**
   * Description
   */

  TraversalPath.prototype.pushContainer = function pushContainer(containerKey, nodes) {
    nodes = this._verifyNodeList(nodes);

    // get an invisible path that represents the last node + 1 and replace it with our
    // nodes, effectively inlining it

    var container = this.node[containerKey];
    var i = container.length;
    var path = TraversalPath.get(this, null, this.node, container, i);

    return path.replaceWith(nodes, true);
  };

  /**
   * Description
   */

  TraversalPath.prototype.replaceWithMultiple = function replaceWithMultiple(nodes) {
    nodes = this._verifyNodeList(nodes);
    t.inheritsComments(nodes[0], this.node);
    this.container[this.key] = null;
    this.insertAfter(nodes);
    if (!this.node) this.remove();
  };

  /**
   * Description
   */

  TraversalPath.prototype.replaceWithSourceString = function replaceWithSourceString(replacement) {
    try {
      replacement = "(" + replacement + ")";
      replacement = (0, _helpersParse2["default"])(replacement);
    } catch (err) {
      var loc = err.loc;
      if (loc) {
        err.message += " - make sure this is an expression.";
        err.message += "\n" + (0, _helpersCodeFrame2["default"])(replacement, loc.line, loc.column + 1);
      }
      throw err;
    }

    replacement = replacement.program.body[0].expression;
    _index2["default"].removeProperties(replacement);
    return this.replaceWith(replacement);
  };

  /**
   * Description
   */

  TraversalPath.prototype.replaceWith = function replaceWith(replacement, whateverAllowed) {
    if (this.removed) {
      throw new Error("You can't replace this node, we've already removed it");
    }

    if (!replacement) {
      throw new Error("You passed `path.replaceWith()` a falsy node, use `path.remove()` instead");
    }

    if (this.node === replacement) {
      return;
    }

    // normalise inserting an entire AST
    if (t.isProgram(replacement)) {
      replacement = replacement.body;
      whateverAllowed = true;
    }

    if (Array.isArray(replacement)) {
      if (whateverAllowed) {
        return this.replaceWithMultiple(replacement);
      } else {
        throw new Error("Don't use `path.replaceWith()` with an array of nodes, use `path.replaceWithMultiple()`");
      }
    }

    if (typeof replacement === "string") {
      if (whateverAllowed) {
        return this.replaceWithSourceString(replacement);
      } else {
        throw new Error("Don't use `path.replaceWith()` with a string, use `path.replaceWithSourceString()`");
      }
    }

    // replacing a statement with an expression so wrap it in an expression statement
    if (this.isPreviousType("Statement") && t.isExpression(replacement)) {
      replacement = t.expressionStatement(replacement);
    }

    // replacing an expression with a statement so let's explode it
    if (this.isPreviousType("Expression") && t.isStatement(replacement)) {
      return this.replaceExpressionWithStatements([replacement]);
    }

    var oldNode = this.node;
    if (oldNode) t.inheritsComments(replacement, oldNode);

    // replace the node
    this.container[this.key] = replacement;
    this.type = replacement.type;

    // potentially create new scope
    this.setScope();
  };

  /**
   * Description
   */

  TraversalPath.prototype.getStatementParent = function getStatementParent() {
    var path = this;

    do {
      if (!path.parentPath || Array.isArray(path.container) && path.isStatement()) {
        break;
      } else {
        path = path.parentPath;
      }
    } while (path);

    if (path && (path.isProgram() || path.isFile())) {
      throw new Error("File/Program node, we can't possibly find a statement parent to this");
    }

    return path;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getLastStatements = function getLastStatements() {
    var paths = [];

    var add = function add(path) {
      if (path) paths = paths.concat(path.getLastStatements());
    };

    if (this.isIfStatement()) {
      add(this.get("consequent"));
      add(this.get("alternate"));
    } else if (this.isDoExpression()) {
      add(this.get("body"));
    } else if (this.isProgram() || this.isBlockStatement()) {
      add(this.get("body").pop());
    } else {
      paths.push(this);
    }

    return paths;
  };

  /**
   * Description
   */

  TraversalPath.prototype.replaceExpressionWithStatements = function replaceExpressionWithStatements(nodes) {
    var toSequenceExpression = t.toSequenceExpression(nodes, this.scope);

    if (toSequenceExpression) {
      return this.replaceWith(toSequenceExpression);
    } else {
      var container = t.functionExpression(null, [], t.blockStatement(nodes));
      container.shadow = true;

      // add implicit returns to all ending expression statements
      var last = this.getLastStatements();
      for (var i = 0; i < last.length; i++) {
        var lastNode = last[i];
        if (lastNode.isExpressionStatement()) {
          lastNode.replaceWith(t.returnStatement(lastNode.node.expression));
        }
      }

      this.replaceWith(t.callExpression(container, []));

      this.traverse(hoistVariablesVisitor);

      return this.node;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.call = function call(key) {
    var node = this.node;
    if (!node) return;

    var opts = this.opts;
    if (!opts[key] && !opts[node.type]) return;

    var fns = [].concat(opts[key]);
    if (opts[node.type]) fns = fns.concat(opts[node.type][key]);

    var _arr4 = fns;
    for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
      var fn = _arr4[_i4];
      if (!fn) continue;

      var node = this.node;
      if (!node) return;

      // call the function with the params (node, parent, scope, state)
      var replacement = fn.call(this, node, this.parent, this.scope, this.state);
      var previousType = this.type;

      if (replacement) {
        this.replaceWith(replacement, true);
      }

      if (this.shouldStop || this.shouldSkip || this.removed) return;

      if (replacement && previousType !== this.type) {
        this.queueNode(this);
        return;
      }
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.isBlacklisted = function isBlacklisted() {
    var blacklist = this.opts.blacklist;
    return blacklist && blacklist.indexOf(this.node.type) > -1;
  };

  /**
   * Description
   */

  TraversalPath.prototype.visit = function visit() {
    if (this.isBlacklisted()) return false;
    if (this.opts.shouldSkip && this.opts.shouldSkip(this)) return false;

    this.call("enter");

    if (this.shouldSkip) {
      return this.shouldStop;
    }

    var node = this.node;
    var opts = this.opts;

    if (node) {
      if (Array.isArray(node)) {
        // traverse over these replacement nodes we purposely don't call exitNode
        // as the original node has been destroyed
        for (var i = 0; i < node.length; i++) {
          _index2["default"].node(node[i], opts, this.scope, this.state, this);
        }
      } else {
        _index2["default"].node(node, opts, this.scope, this.state, this);
        this.call("exit");
      }
    }

    return this.shouldStop;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getSibling = function getSibling(key) {
    return TraversalPath.get(this.parentPath, null, this.parent, this.container, key, this.file);
  };

  /**
   * Description
   */

  TraversalPath.prototype.get = function get(key) {
    var parts = key.split(".");
    if (parts.length === 1) {
      // "foo"
      return this._getKey(key);
    } else {
      // "foo.bar"
      return this._getPattern(parts);
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype._getKey = function _getKey(key) {
    var _this = this;

    var node = this.node;
    var container = node[key];

    if (Array.isArray(container)) {
      // requested a container so give them all the paths
      return container.map(function (_, i) {
        return TraversalPath.get(_this, null, node, container, i);
      });
    } else {
      return TraversalPath.get(this, null, node, node, key);
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype._getPattern = function _getPattern(parts) {
    var path = this;
    var _arr5 = parts;
    for (var _i5 = 0; _i5 < _arr5.length; _i5++) {
      var part = _arr5[_i5];
      if (part === ".") {
        path = path.parentPath;
      } else {
        if (Array.isArray(path)) {
          path = path[part];
        } else {
          path = path.get(part);
        }
      }
    }
    return path;
  };

  /**
   * Description
   */

  TraversalPath.prototype.has = function has(key) {
    var val = this.node[key];
    if (val && Array.isArray(val)) {
      return !!val.length;
    } else {
      return !!val;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.is = function is(key) {
    return this.has(key);
  };

  /**
   * Description
   */

  TraversalPath.prototype.isnt = function isnt(key) {
    return !this.has(key);
  };

  /**
   * Description
   */

  TraversalPath.prototype.equals = function equals(key, value) {
    return this.node[key] === value;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getTypeAnnotation = function getTypeAnnotation() {
    if (this.typeInfo) {
      return this.typeInfo;
    }

    var info = this.typeInfo = {
      inferred: false,
      annotation: null
    };

    var type = this.node && this.node.typeAnnotation;

    if (!type) {
      info.inferred = true;
      type = this.inferType(this);
    }

    if (type) {
      if (t.isTypeAnnotation(type)) type = type.typeAnnotation;
      info.annotation = type;
    }

    return info;
  };

  /**
   * Description
   */

  TraversalPath.prototype.resolve = function resolve() {
    if (this.isVariableDeclarator()) {
      if (this.get("id").isIdentifier()) {
        return this.get("init").resolve();
      } else {}
    } else if (this.isIdentifier()) {
      var binding = this.scope.getBinding(this.node.name);
      if (!binding || !binding.constant) return;

      // todo: take into consideration infinite recursion #1149
      return;

      if (binding.path === this) {
        return this;
      } else {
        return binding.path.resolve();
      }
    } else if (this.isMemberExpression()) {
      // this is dangerous, as non-direct target assignments will mutate it's state
      // making this resolution inaccurate

      var targetKey = this.toComputedKey();
      if (!t.isLiteral(targetKey)) return;
      var targetName = targetKey.value;

      var target = this.get("object").resolve();
      if (!target || !target.isObjectExpression()) return;

      var props = target.get("properties");
      for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop.isProperty()) continue;

        var key = prop.get("key");

        // { foo: obj }
        var match = prop.isnt("computed") && key.isIdentifier({ name: targetName });

        // { "foo": "obj" } or { ["foo"]: "obj" }
        match = match || key.isLiteral({ value: targetName });

        if (match) return prop.get("value");
      }
    } else {
      return this;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.inferType = function inferType(path) {
    path = path.resolve();
    if (!path) return;

    if (path.isPreviousType("RestElement") || path.parentPath.isPreviousType("RestElement") || path.isPreviousType("ArrayExpression")) {
      return t.genericTypeAnnotation(t.identifier("Array"));
    }

    if (path.parentPath.isPreviousType("TypeCastExpression")) {
      return path.parentPath.node.typeAnnotation;
    }

    if (path.isPreviousType("TypeCastExpression")) {
      return path.node.typeAnnotation;
    }

    if (path.isPreviousType("ObjectExpression")) {
      return t.genericTypeAnnotation(t.identifier("Object"));
    }

    if (path.isPreviousType("Function")) {
      return t.identifier("Function");
    }

    if (path.isPreviousType("Literal")) {
      var value = path.node.value;
      if ((0, _lodashLangIsString2["default"])(value)) return t.stringTypeAnnotation();
      if ((0, _lodashLangIsNumber2["default"])(value)) return t.numberTypeAnnotation();
      if ((0, _lodashLangIsBoolean2["default"])(value)) return t.booleanTypeAnnotation();
    }

    if (path.isPreviousType("CallExpression")) {
      var callee = path.get("callee").resolve();
      if (callee && callee.isPreviousType("Function")) return callee.node.returnType;
    }
  };

  /**
   * Description
   */

  TraversalPath.prototype.isPreviousType = function isPreviousType(type) {
    return t.isType(this.type, type);
  };

  /**
   * Description
   */

  TraversalPath.prototype.isTypeGeneric = function isTypeGeneric(genericName) {
    var opts = arguments[1] === undefined ? {} : arguments[1];

    var typeInfo = this.getTypeAnnotation();
    var type = typeInfo.annotation;
    if (!type) return false;

    if (typeInfo.inferred && opts.inference === false) {
      return false;
    }

    if (!t.isGenericTypeAnnotation(type) || !t.isIdentifier(type.id, { name: genericName })) {
      return false;
    }

    if (opts.requireTypeParameters && !type.typeParameters) {
      return false;
    }

    return true;
  };

  /**
   * Description
   */

  TraversalPath.prototype.getBindingIdentifiers = function getBindingIdentifiers() {
    return t.getBindingIdentifiers(this.node);
  };

  /**
   * Description
   */

  TraversalPath.prototype.traverse = function traverse(visitor, state) {
    (0, _index2["default"])(this.node, visitor, this.scope, state, this);
  };

  /**
   * Description
   */

  TraversalPath.prototype.hoist = function hoist() {
    var scope = arguments[0] === undefined ? this.scope : arguments[0];

    var hoister = new _hoister2["default"](this, scope);
    return hoister.run();
  };

  /**
   * Match the current node if it matches the provided `pattern`.
   *
   * For example, given the match `React.createClass` it would match the
   * parsed nodes of `React.createClass` and `React["createClass"]`.
   */

  TraversalPath.prototype.matchesPattern = function matchesPattern(pattern, allowPartial) {
    var parts = pattern.split(".");

    // not a member expression
    if (!this.isMemberExpression()) return false;

    var search = [this.node];
    var i = 0;

    function matches(name) {
      var part = parts[i];
      return part === "*" || name === part;
    }

    while (search.length) {
      var node = search.shift();

      if (allowPartial && i === parts.length) {
        return true;
      }

      if (t.isIdentifier(node)) {
        // this part doesn't match
        if (!matches(node.name)) return false;
      } else if (t.isLiteral(node)) {
        // this part doesn't match
        if (!matches(node.value)) return false;
      } else if (t.isMemberExpression(node)) {
        if (node.computed && !t.isLiteral(node.property)) {
          // we can't deal with this
          return false;
        } else {
          search.push(node.object);
          search.push(node.property);
          continue;
        }
      } else {
        // we can't deal with this
        return false;
      }

      // too many parts
      if (++i > parts.length) {
        return false;
      }
    }

    return true;
  };

  _createClass(TraversalPath, [{
    key: "node",
    get: function () {
      if (this.removed) {
        return null;
      } else {
        return this.container[this.key];
      }
    },
    set: function (replacement) {
      throw new Error("Don't use `path.node = newNode;`, use `path.replaceWith(newNode)` or `path.replaceWithMultiple([newNode])`");
    }
  }]);

  return TraversalPath;
})();

exports["default"] = TraversalPath;

(0, _lodashObjectAssign2["default"])(TraversalPath.prototype, require("./evaluation"));
(0, _lodashObjectAssign2["default"])(TraversalPath.prototype, require("./conversion"));

var _loop = function (type) {
  if (type[0] === "_") return "continue";

  TraversalPath.prototype["is" + type] = function (opts) {
    return virtualTypes[type].checkPath(this, opts);
  };
};

for (var type in virtualTypes) {
  var _ret = _loop(type);

  if (_ret === "continue") continue;
}

var _arr2 = t.TYPES;

var _loop2 = function () {
  var type = _arr2[_i2];
  var typeKey = "is" + type;
  TraversalPath.prototype[typeKey] = function (opts) {
    return t[typeKey](this.node, opts);
  };
};

for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
  _loop2();
}
module.exports = exports["default"];

// otherwise it's a request for a destructuring declarator and i'm not
// ready to resolve those just yet
},{"../../helpers/code-frame":42,"../../helpers/parse":45,"../../types":167,"../index":156,"../scope":162,"../visitors":163,"./conversion":157,"./evaluation":158,"./hoister":159,"./virtual-types":161,"lodash/collection/includes":330,"lodash/lang/isBoolean":404,"lodash/lang/isNumber":408,"lodash/lang/isRegExp":411,"lodash/lang/isString":412,"lodash/object/assign":415,"lodash/object/extend":417}],161:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _types = require("../../types");

var t = _interopRequireWildcard(_types);

var ReferencedIdentifier = {
  type: "Identifier",
  checkPath: function checkPath(path, opts) {
    return t.isReferencedIdentifier(path.node, path.parent, opts);
  }
};

exports.ReferencedIdentifier = ReferencedIdentifier;
var Scope = {
  type: "Scopable",
  checkPath: function checkPath(path) {
    return t.isScope(path.node, path.parent);
  }
};

exports.Scope = Scope;
var Referenced = {
  checkPath: function checkPath(path) {
    return t.isReferenced(path.node, path.parent);
  }
};

exports.Referenced = Referenced;
var BlockScoped = {
  checkPath: function checkPath(path) {
    return t.isBlockScoped(path.node);
  }
};

exports.BlockScoped = BlockScoped;
var Var = {
  type: "VariableDeclaration",
  checkPath: function checkPath(path) {
    return t.isVar(path.node);
  }
};
exports.Var = Var;
},{"../../types":167}],162:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodashCollectionIncludes = require("lodash/collection/includes");

var _lodashCollectionIncludes2 = _interopRequireDefault(_lodashCollectionIncludes);

var _visitors = require("./visitors");

var _index = require("./index");

var _index2 = _interopRequireDefault(_index);

var _lodashObjectDefaults = require("lodash/object/defaults");

var _lodashObjectDefaults2 = _interopRequireDefault(_lodashObjectDefaults);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _binding = require("./binding");

var _binding2 = _interopRequireDefault(_binding);

var _globals = require("globals");

var _globals2 = _interopRequireDefault(_globals);

var _lodashArrayFlatten = require("lodash/array/flatten");

var _lodashArrayFlatten2 = _interopRequireDefault(_lodashArrayFlatten);

var _lodashObjectExtend = require("lodash/object/extend");

var _lodashObjectExtend2 = _interopRequireDefault(_lodashObjectExtend);

var _helpersObject = require("../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var functionVariableVisitor = {
  enter: function enter(node, parent, scope, state) {
    if (t.isFor(node)) {
      var _arr = t.FOR_INIT_KEYS;

      for (var _i = 0; _i < _arr.length; _i++) {
        var key = _arr[_i];
        var declar = this.get(key);
        if (declar.isVar()) state.scope.registerBinding("var", declar);
      }
    }

    // this block is a function so we'll stop since none of the variables
    // declared within are accessible
    if (this.isFunction()) return this.skip();

    // function identifier doesn't belong to this scope
    if (state.blockId && node === state.blockId) return;

    // delegate block scope handling to the `blockVariableVisitor`
    if (this.isBlockScoped()) return;

    // this will be hit again once we traverse into it after this iteration
    if (this.isExportDeclaration() && t.isDeclaration(node.declaration)) return;

    // we've ran into a declaration!
    if (this.isDeclaration()) state.scope.registerDeclaration(this);
  }
};

var programReferenceVisitor = (0, _visitors.explode)({
  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    var bindingInfo = scope.getBinding(node.name);
    if (bindingInfo) {
      bindingInfo.reference();
    } else {
      state.addGlobal(node);
    }
  },

  Scopable: function Scopable(node, parent, scope, state) {
    for (var name in scope.bindings) {
      state.references[name] = true;
    }
  },

  ExportDeclaration: {
    exit: function exit(node, parent, scope, state) {
      var declar = node.declaration;
      if (t.isClassDeclaration(declar) || t.isFunctionDeclaration(declar)) {
        scope.getBinding(declar.id.name).reference();
      } else if (t.isVariableDeclaration(declar)) {
        var _arr2 = declar.declarations;

        for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
          var decl = _arr2[_i2];
          var ids = t.getBindingIdentifiers(decl);
          for (var name in ids) {
            scope.getBinding(name).reference();
          }
        }
      }
    }
  },

  LabeledStatement: function LabeledStatement(node, parent, scope, state) {
    state.addGlobal(node);
  },

  AssignmentExpression: function AssignmentExpression(node, parent, scope, state) {
    scope.registerConstantViolation(this.get("left"), this.get("right"));
  },

  UpdateExpression: function UpdateExpression(node, parent, scope, state) {
    scope.registerConstantViolation(this.get("argument"), null);
  },

  UnaryExpression: function UnaryExpression(node, parent, scope, state) {
    if (node.operator === "delete") scope.registerConstantViolation(this.get("left"), null);
  }
});

var blockVariableVisitor = (0, _visitors.explode)({
  Scope: function Scope() {
    this.skip();
  },

  enter: function enter(node, parent, scope, state) {
    if (this.isFunctionDeclaration() || this.isBlockScoped()) {
      state.registerDeclaration(this);
    }
  }
});

var renameVisitor = (0, _visitors.explode)({
  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    if (node.name === state.oldName) {
      node.name = state.newName;
    }
  },

  Declaration: function Declaration(node, parent, scope, state) {
    var ids = this.getBindingIdentifiers();;

    for (var name in ids) {
      if (name === state.oldName) ids[name].name = state.newName;
    }
  },

  Scopable: function Scopable(node, parent, scope, state) {
    if (this.isScope()) {
      if (!scope.bindingIdentifierEquals(state.oldName, state.binding)) {
        this.skip();
      }
    }
  }
});

var Scope = (function () {

  /**
   * This searches the current "scope" and collects all references/bindings
   * within.
   */

  function Scope(path, parent, file) {
    _classCallCheck(this, Scope);

    if (parent && parent.block === path.node) {
      return parent;
    }

    var cached = path.getData("scope");
    if (cached && cached.parent === parent) {
      return cached;
    } else {}

    this.parent = parent;
    this.file = parent ? parent.file : file;

    this.parentBlock = path.parent;
    this.block = path.node;
    this.path = path;

    this.crawl();
  }

  /**
   * Description
   */

  Scope.prototype.traverse = function traverse(node, opts, state) {
    (0, _index2["default"])(node, opts, this, state, this.path);
  };

  /**
   * Description
   */

  Scope.prototype.generateTemp = function generateTemp() {
    var name = arguments[0] === undefined ? "temp" : arguments[0];

    var id = this.generateUidIdentifier(name);
    this.push({ id: id });
    return id;
  };

  /**
   * Description
   */

  Scope.prototype.generateUidIdentifier = function generateUidIdentifier(name) {
    return t.identifier(this.generateUid(name));
  };

  /**
   * Description
   */

  Scope.prototype.generateUid = function generateUid(name) {
    name = t.toIdentifier(name).replace(/^_+/, "");

    var uid;
    var i = 0;
    do {
      uid = this._generateUid(name, i);
      i++;
    } while (this.hasBinding(uid) || this.hasGlobal(uid) || this.hasReference(uid));

    var program = this.getProgramParent();
    program.references[uid] = true;
    program.uids[uid] = true;

    return uid;
  };

  Scope.prototype._generateUid = function _generateUid(name, i) {
    var id = name;
    if (i > 1) id += i;
    return "_" + id;
  };

  /*
   * Description
   */

  Scope.prototype.generateUidBasedOnNode = function generateUidBasedOnNode(parent, defaultName) {
    var node = parent;

    if (t.isAssignmentExpression(parent)) {
      node = parent.left;
    } else if (t.isVariableDeclarator(parent)) {
      node = parent.id;
    } else if (t.isProperty(node)) {
      node = node.key;
    }

    var parts = [];

    var add = function add(node) {
      if (t.isModuleDeclaration(node)) {
        if (node.source) {
          add(node.source);
        } else if (node.specifiers && node.specifiers.length) {
          var _arr3 = node.specifiers;

          for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
            var specifier = _arr3[_i3];
            add(specifier);
          }
        } else if (node.declaration) {
          add(node.declaration);
        }
      } else if (t.isModuleSpecifier(node)) {
        add(node.local);
      } else if (t.isMemberExpression(node)) {
        add(node.object);
        add(node.property);
      } else if (t.isIdentifier(node)) {
        parts.push(node.name);
      } else if (t.isLiteral(node)) {
        parts.push(node.value);
      } else if (t.isCallExpression(node)) {
        add(node.callee);
      } else if (t.isObjectExpression(node) || t.isObjectPattern(node)) {
        var _arr4 = node.properties;

        for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
          var prop = _arr4[_i4];
          add(prop.key || prop.argument);
        }
      }
    };

    add(node);

    var id = parts.join("$");
    id = id.replace(/^_/, "") || defaultName || "ref";

    return this.generateUidIdentifier(id);
  };

  /**
   * Description
   */

  Scope.prototype.generateMemoisedReference = function generateMemoisedReference(node, dontPush) {
    if (t.isThisExpression(node) || t.isSuper(node)) {
      return null;
    }

    if (t.isIdentifier(node) && this.hasBinding(node.name)) {
      return null;
    }

    var id = this.generateUidBasedOnNode(node);
    if (!dontPush) this.push({ id: id });
    return id;
  };

  /**
   * Description
   */

  Scope.prototype.checkBlockScopedCollisions = function checkBlockScopedCollisions(kind, name, id) {
    var local = this.getOwnBindingInfo(name);
    if (!local) return;

    if (kind === "param") return;
    if (kind === "hoisted" && local.kind === "let") return;

    var duplicate = false;
    if (!duplicate) duplicate = kind === "let" || kind === "const" || local.kind === "let" || local.kind === "const" || local.kind === "module";
    if (!duplicate) duplicate = local.kind === "param" && (kind === "let" || kind === "const");

    if (duplicate) {
      throw this.file.errorWithNode(id, messages.get("scopeDuplicateDeclaration", name), TypeError);
    }
  };

  /**
   * Description
   */

  Scope.prototype.rename = function rename(oldName, newName, block) {
    newName = newName || this.generateUidIdentifier(oldName).name;

    var info = this.getBinding(oldName);
    if (!info) return;

    var state = {
      newName: newName,
      oldName: oldName,
      binding: info.identifier,
      info: info
    };

    var scope = info.scope;
    scope.traverse(block || scope.block, renameVisitor, state);

    if (!block) {
      scope.removeOwnBinding(oldName);
      scope.bindings[newName] = info;
      state.binding.name = newName;
    }

    var file = this.file;
    if (file) {
      this._renameFromMap(file.moduleFormatter.localImports, oldName, newName, state.binding);
      //this._renameFromMap(file.moduleFormatter.localExports, oldName, newName);
    }
  };

  Scope.prototype._renameFromMap = function _renameFromMap(map, oldName, newName, value) {
    if (map[oldName]) {
      map[newName] = value;
      map[oldName] = null;
    }
  };

  /**
   * Description
   */

  Scope.prototype.dump = function dump() {
    var scope = this;
    do {
      console.log(scope.block.type, "Bindings:", Object.keys(scope.bindings));
    } while (scope = scope.parent);
    console.log("-------------");
  };

  /**
   * Description
   */

  Scope.prototype.toArray = function toArray(node, i) {
    var file = this.file;

    if (t.isIdentifier(node)) {
      var binding = this.getBinding(node.name);
      if (binding && binding.constant && binding.isTypeGeneric("Array")) return node;
    }

    if (t.isArrayExpression(node)) {
      return node;
    }

    if (t.isIdentifier(node, { name: "arguments" })) {
      return t.callExpression(t.memberExpression(file.addHelper("slice"), t.identifier("call")), [node]);
    }

    var helperName = "to-array";
    var args = [node];
    if (i === true) {
      helperName = "to-consumable-array";
    } else if (i) {
      args.push(t.literal(i));
      helperName = "sliced-to-array";
      if (this.file.isLoose("es6.forOf")) helperName += "-loose";
    }
    return t.callExpression(file.addHelper(helperName), args);
  };

  /**
   * Description
   */

  Scope.prototype.registerDeclaration = function registerDeclaration(path) {
    var node = path.node;
    if (t.isFunctionDeclaration(node)) {
      this.registerBinding("hoisted", path);
    } else if (t.isVariableDeclaration(node)) {
      var declarations = path.get("declarations");
      var _arr5 = declarations;
      for (var _i5 = 0; _i5 < _arr5.length; _i5++) {
        var declar = _arr5[_i5];
        this.registerBinding(node.kind, declar);
      }
    } else if (t.isClassDeclaration(node)) {
      this.registerBinding("let", path);
    } else if (t.isImportDeclaration(node) || t.isExportDeclaration(node)) {
      this.registerBinding("module", path);
    } else {
      this.registerBinding("unknown", path);
    }
  };

  /**
   * Description
   */

  Scope.prototype.registerConstantViolation = function registerConstantViolation(left, right) {
    var ids = left.getBindingIdentifiers();
    for (var name in ids) {
      var binding = this.getBinding(name);
      if (!binding) continue;
      if (right) {
        var rightType = right.typeAnnotation;
        if (rightType && binding.isCompatibleWithType(rightType)) continue;
      }
      binding.reassign();
    }
  };

  /**
   * Description
   */

  Scope.prototype.registerBinding = function registerBinding(kind, path) {
    if (!kind) throw new ReferenceError("no `kind`");

    var ids = path.getBindingIdentifiers();

    for (var name in ids) {
      var id = ids[name];

      this.checkBlockScopedCollisions(kind, name, id);

      this.bindings[name] = new _binding2["default"]({
        identifier: id,
        scope: this,
        path: path,
        kind: kind
      });
    }
  };

  /**
   * Description
   */

  Scope.prototype.addGlobal = function addGlobal(node) {
    this.globals[node.name] = node;
  };

  /**
   * Description
   */

  Scope.prototype.hasUid = function hasUid(name) {
    var scope = this;

    do {
      if (scope.uids[name]) return true;
    } while (scope = scope.parent);

    return false;
  };

  /**
   * Description
   */

  Scope.prototype.hasGlobal = function hasGlobal(name) {
    var scope = this;

    do {
      if (scope.globals[name]) return true;
    } while (scope = scope.parent);

    return false;
  };

  /**
   * Description
   */

  Scope.prototype.hasReference = function hasReference(name) {
    var scope = this;

    do {
      if (scope.references[name]) return true;
    } while (scope = scope.parent);

    return false;
  };

  /**
   * Description
   */

  Scope.prototype.recrawl = function recrawl() {
    this.path.setData("scopeInfo", null);
    this.crawl();
  };

  /**
   * Description
   */

  Scope.prototype.isPure = function isPure(node) {
    if (t.isIdentifier(node)) {
      var bindingInfo = this.getBinding(node.name);
      return bindingInfo.constant;
    } else {
      return t.isPure(node);
    }
  };

  /**
   * Description
   */

  Scope.prototype.crawl = function crawl() {
    var path = this.path;

    //

    var info = this.block._scopeInfo;
    if (info) return (0, _lodashObjectExtend2["default"])(this, info);

    info = this.block._scopeInfo = {
      references: (0, _helpersObject2["default"])(),
      bindings: (0, _helpersObject2["default"])(),
      globals: (0, _helpersObject2["default"])(),
      uids: (0, _helpersObject2["default"])() };

    (0, _lodashObjectExtend2["default"])(this, info);

    // ForStatement - left, init

    if (path.isLoop()) {
      var _arr6 = t.FOR_INIT_KEYS;

      for (var _i6 = 0; _i6 < _arr6.length; _i6++) {
        var key = _arr6[_i6];
        var node = path.get(key);
        if (node.isBlockScoped()) this.registerBinding(node.node.kind, node);
      }
    }

    // FunctionExpression - id

    if (path.isFunctionExpression() && path.has("id")) {
      if (!t.isProperty(path.parent, { method: true })) {
        this.registerBinding("var", path.get("id"));
      }
    }

    // Class

    if (path.isClass() && path.has("id")) {
      this.registerBinding("var", path.get("id"));
    }

    // Function - params, rest

    if (path.isFunction()) {
      var params = path.get("params");
      var _arr7 = params;
      for (var _i7 = 0; _i7 < _arr7.length; _i7++) {
        var param = _arr7[_i7];
        this.registerBinding("param", param);
      }
      this.traverse(path.get("body").node, blockVariableVisitor, this);
    }

    // Program, Function - var variables

    if (path.isProgram() || path.isFunction()) {
      this.traverse(path.node, functionVariableVisitor, {
        blockId: path.get("id").node,
        scope: this
      });
    }

    // Program, BlockStatement, Function - let variables

    if (path.isBlockStatement() || path.isProgram()) {
      this.traverse(path.node, blockVariableVisitor, this);
    }

    // CatchClause - param

    if (path.isCatchClause()) {
      this.registerBinding("let", path.get("param"));
    }

    // ComprehensionExpression - blocks

    if (path.isComprehensionExpression()) {
      this.registerBinding("let", path);
    }

    // Program

    if (path.isProgram()) {
      this.traverse(path.node, programReferenceVisitor, this);
    }
  };

  /**
   * Description
   */

  Scope.prototype.push = function push(opts) {
    var path = this.path;

    if (path.isLoop() || path.isCatchClause() || path.isFunction()) {
      t.ensureBlock(path.node);
      path = path.get("body");
    }

    if (!path.isBlockStatement() && !path.isProgram()) {
      path = this.getBlockParent().path;
    }

    var unique = opts.unique;
    var kind = opts.kind || "var";

    var dataKey = "declaration:" + kind;
    var declar = !unique && path.getData(dataKey);

    if (!declar) {
      declar = t.variableDeclaration(kind, []);
      declar._generated = true;
      declar._blockHoist = 2;

      this.file.attachAuxiliaryComment(declar);

      var _path$get$0$_containerInsertBefore = path.get("body")[0]._containerInsertBefore([declar]);

      var declarPath = _path$get$0$_containerInsertBefore[0];

      this.registerBinding(kind, declarPath);
      if (!unique) path.setData(dataKey, declar);
    }

    declar.declarations.push(t.variableDeclarator(opts.id, opts.init));
  };

  /**
   * Walk up to the top of the scope tree and get the `Program`.
   */

  Scope.prototype.getProgramParent = function getProgramParent() {
    var scope = this;
    while (scope.parent) {
      scope = scope.parent;
    }
    return scope;
  };

  /**
   * Walk up the scope tree until we hit either a Function or reach the
   * very top and hit Program.
   */

  Scope.prototype.getFunctionParent = function getFunctionParent() {
    var scope = this;
    while (scope.parent && !t.isFunction(scope.block)) {
      scope = scope.parent;
    }
    return scope;
  };

  /**
   * Walk up the scope tree until we hit either a BlockStatement/Loop or reach the
   * very top and hit Program.
   */

  Scope.prototype.getBlockParent = function getBlockParent() {
    var scope = this;
    while (scope.parent && !t.isFunction(scope.block) && !t.isLoop(scope.block) && !t.isFunction(scope.block)) {
      scope = scope.parent;
    }
    return scope;
  };

  /**
   * Walks the scope tree and gathers **all** bindings.
   */

  Scope.prototype.getAllBindings = function getAllBindings() {
    var ids = (0, _helpersObject2["default"])();

    var scope = this;
    do {
      (0, _lodashObjectDefaults2["default"])(ids, scope.bindings);
      scope = scope.parent;
    } while (scope);

    return ids;
  };

  /**
   * Walks the scope tree and gathers all declarations of `kind`.
   */

  Scope.prototype.getAllBindingsOfKind = function getAllBindingsOfKind() {
    var ids = (0, _helpersObject2["default"])();

    var _arr8 = arguments;
    for (var _i8 = 0; _i8 < _arr8.length; _i8++) {
      var kind = _arr8[_i8];
      var scope = this;
      do {
        for (var name in scope.bindings) {
          var binding = scope.bindings[name];
          if (binding.kind === kind) ids[name] = binding;
        }
        scope = scope.parent;
      } while (scope);
    }

    return ids;
  };

  /**
   * Description
   */

  Scope.prototype.bindingIdentifierEquals = function bindingIdentifierEquals(name, node) {
    return this.getBindingIdentifier(name) === node;
  };

  /**
   * Description
   */

  Scope.prototype.getBinding = function getBinding(name) {
    var scope = this;

    do {
      var binding = scope.getOwnBindingInfo(name);
      if (binding) return binding;
    } while (scope = scope.parent);
  };

  /**
   * Description
   */

  Scope.prototype.getOwnBindingInfo = function getOwnBindingInfo(name) {
    return this.bindings[name];
  };

  /**
   * Description
   */

  Scope.prototype.getBindingIdentifier = function getBindingIdentifier(name) {
    var info = this.getBinding(name);
    return info && info.identifier;
  };

  /**
   * Description
   */

  Scope.prototype.getOwnBindingIdentifier = function getOwnBindingIdentifier(name) {
    var binding = this.bindings[name];
    return binding && binding.identifier;
  };

  /**
   * Description
   */

  Scope.prototype.hasOwnBinding = function hasOwnBinding(name) {
    return !!this.getOwnBindingInfo(name);
  };

  /**
   * Description
   */

  Scope.prototype.hasBinding = function hasBinding(name) {
    if (!name) return false;
    if (this.hasOwnBinding(name)) return true;
    if (this.parentHasBinding(name)) return true;
    if (this.hasUid(name)) return true;
    if ((0, _lodashCollectionIncludes2["default"])(Scope.globals, name)) return true;
    if ((0, _lodashCollectionIncludes2["default"])(Scope.contextVariables, name)) return true;
    return false;
  };

  /**
   * Description
   */

  Scope.prototype.parentHasBinding = function parentHasBinding(name) {
    return this.parent && this.parent.hasBinding(name);
  };

  /**
   * Move a binding of `name` to another `scope`.
   */

  Scope.prototype.moveBindingTo = function moveBindingTo(name, scope) {
    var info = this.getBinding(name);
    if (info) {
      info.scope.removeOwnBinding(name);
      info.scope = scope;
      scope.bindings[name] = info;
    }
  };

  /**
   * Description
   */

  Scope.prototype.removeOwnBinding = function removeOwnBinding(name) {
    delete this.bindings[name];
  };

  /**
   * Description
   */

  Scope.prototype.removeBinding = function removeBinding(name) {
    var info = this.getBinding(name);
    if (info) info.scope.removeOwnBinding(name);
  };

  _createClass(Scope, null, [{
    key: "globals",
    value: (0, _lodashArrayFlatten2["default"])([_globals2["default"].builtin, _globals2["default"].browser, _globals2["default"].node].map(Object.keys)),
    enumerable: true
  }, {
    key: "contextVariables",
    value: ["this", "arguments", "super"],
    enumerable: true
  }]);

  return Scope;
})();

exports["default"] = Scope;
module.exports = exports["default"];

//path.setData("scope", this);
},{"../helpers/object":44,"../messages":46,"../types":167,"./binding":154,"./index":156,"./visitors":163,"globals":314,"lodash/array/flatten":323,"lodash/collection/each":328,"lodash/collection/includes":330,"lodash/object/defaults":416,"lodash/object/extend":417}],163:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.explode = explode;
exports.verify = verify;
exports.merge = merge;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _pathVirtualTypes = require("./path/virtual-types");

var virtualTypes = _interopRequireWildcard(_pathVirtualTypes);

var _messages = require("../messages");

var messages = _interopRequireWildcard(_messages);

var _types = require("../types");

var t = _interopRequireWildcard(_types);

var _esquery = require("esquery");

var _esquery2 = _interopRequireDefault(_esquery);

function explode(visitor, mergeConflicts) {
  if (visitor._exploded) return visitor;
  visitor._exploded = true;

  // make sure there's no __esModule type since this is because we're using loose mode
  // and it sets __esModule to be enumerable on all modules :(
  delete visitor.__esModule;

  if (visitor.queries) {
    ensureEntranceObjects(visitor.queries);
    addQueries(visitor);
    delete visitor.queries;
  }

  // ensure visitors are objects
  ensureEntranceObjects(visitor);

  // add type wrappers
  for (var nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    var wrapper = virtualTypes[nodeType];
    if (!wrapper) continue;

    // wrap all the functions
    var fns = visitor[nodeType];
    for (var type in fns) {
      fns[type] = wrapCheck(wrapper, fns[type]);
    }

    // clear it from the visitor
    delete visitor[nodeType];

    if (wrapper.type) {
      // merge the visitor if necessary or just put it back in
      if (visitor[wrapper.type]) {
        mergePair(visitor[wrapper.type], fns);
      } else {
        visitor[wrapper.type] = fns;
      }
    } else {
      mergePair(visitor, fns);
    }
  }

  // add aliases
  for (var nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    var fns = visitor[nodeType];

    var aliases = t.FLIPPED_ALIAS_KEYS[nodeType];
    if (!aliases) continue;

    // clear it form the visitor
    delete visitor[nodeType];

    var _arr = aliases;
    for (var _i = 0; _i < _arr.length; _i++) {
      var alias = _arr[_i];
      var existing = visitor[alias];
      if (existing) {
        if (mergeConflicts) {
          mergePair(existing, fns);
        }
      } else {
        visitor[alias] = fns;
      }
    }
  }

  return visitor;
}

function verify(visitor) {
  if (visitor._verified) return;

  if (typeof visitor === "function") {
    throw new Error(messages.get("traverseVerifyRootFunction"));
  }

  for (var nodeType in visitor) {
    if (shouldIgnoreKey(nodeType)) continue;

    if (t.TYPES.indexOf(nodeType) < 0 && !virtualTypes[nodeType]) {
      throw new Error(messages.get("traverseVerifyNodeType", nodeType));
    }

    var visitors = visitor[nodeType];
    if (typeof visitors === "object") {
      for (var visitorKey in visitors) {
        if (visitorKey === "enter" || visitorKey === "exit") continue;
        throw new Error(messages.get("traverseVerifyVisitorProperty", nodeType, visitorKey));
      }
    }
  }

  visitor._verified = true;
}

function merge(visitors) {
  var rootVisitor = {};

  var _arr2 = visitors;
  for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
    var visitor = _arr2[_i2];
    for (var type in visitor) {
      var nodeVisitor = rootVisitor[type] = rootVisitor[type] || {};
      mergePair(nodeVisitor, visitor[type]);
    }
  }

  return rootVisitor;
}

function ensureEntranceObjects(obj) {
  for (var key in obj) {
    if (shouldIgnoreKey(key)) continue;

    var fns = obj[key];
    if (typeof fns === "function") {
      obj[key] = { enter: fns };
    }
  }
}

function addQueries(visitor) {
  for (var selector in visitor.queries) {
    var fns = visitor.queries[selector];
    addSelector(visitor, selector, fns);
  }
}

function addSelector(visitor, selector, fns) {
  selector = _esquery2["default"].parse(selector);

  var _loop = function () {
    var fn = fns[key];
    fns[key] = function (node) {
      if (_esquery2["default"].matches(node, selector, this.getAncestry())) {
        return fn.apply(this, arguments);
      }
    };
  };

  for (var key in fns) {
    _loop();
  }

  mergePair(visitor, fns);
}

function wrapCheck(wrapper, fn) {
  return function () {
    if (wrapper.checkPath(this)) {
      return fn.apply(this, arguments);
    }
  };
}

function shouldIgnoreKey(key) {
  // internal/hidden key
  if (key[0] === "_") return true;

  // ignore function keys
  if (key === "enter" || key === "exit" || key === "shouldSkip") return true;

  // ignore other options
  if (key === "blacklist" || key === "noScope") return true;

  return false;
}

function mergePair(dest, src) {
  for (var key in src) {
    dest[key] = (dest[key] || []).concat(src[key]);
  }
}
},{"../messages":46,"../types":167,"./path/virtual-types":161,"esquery":305}],164:[function(require,module,exports){
module.exports={
  "ExpressionStatement":      ["Statement"],
  "BreakStatement":           ["Statement", "Terminatorless"],
  "ContinueStatement":        ["Statement", "Terminatorless"],
  "DebuggerStatement":        ["Statement"],
  "DoWhileStatement":         ["Statement", "Loop", "While", "Scopable"],
  "IfStatement":              ["Statement"],
  "ReturnStatement":          ["Statement", "Terminatorless"],
  "SwitchStatement":          ["Statement", "Scopable"],
  "ThrowStatement":           ["Statement", "Terminatorless"],
  "TryStatement":             ["Statement"],
  "WhileStatement":           ["Statement", "Loop", "While", "Scopable"],
  "WithStatement":            ["Statement"],
  "EmptyStatement":           ["Statement"],
  "LabeledStatement":         ["Statement"],
  "VariableDeclaration":      ["Statement", "Declaration"],

  "ImportSpecifier":            ["ModuleSpecifier"],
  "ExportSpecifier":            ["ModuleSpecifier"],
  "ImportDefaultSpecifier":     ["ModuleSpecifier"],
  "ExportDefaultSpecifier":     ["ModuleSpecifier"],
  "ExportNamespaceSpecifier":   ["ModuleSpecifier"],
  "ExportDefaultFromSpecifier": ["ModuleSpecifier"],
  "ExportAllDeclaration":       ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  "ExportDefaultDeclaration":   ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  "ExportNamedDeclaration":     ["Statement", "Declaration", "ModuleDeclaration", "ExportDeclaration"],
  "ImportDeclaration":          ["Statement", "Declaration", "ModuleDeclaration"],

  "ArrowFunctionExpression": ["Scopable", "Function", "Func", "Expression", "Pure"],
  "FunctionDeclaration":     ["Scopable", "Function", "Func", "Statement", "Pure", "Declaration"],
  "FunctionExpression":      ["Scopable", "Function", "Func", "Expression", "Pure"],

  "BlockStatement": ["Scopable", "Statement"],
  "Program":        ["Scopable"],
  "CatchClause":    ["Scopable"],

  "LogicalExpression": ["Binary", "Expression"],
  "BinaryExpression":  ["Binary", "Expression"],

  "UnaryExpression": ["UnaryLike", "Expression"],
  "SpreadProperty":  ["UnaryLike"],
  "SpreadElement":   ["UnaryLike"],

  "ClassDeclaration": ["Scopable", "Class", "Pure", "Statement", "Declaration"],
  "ClassExpression":  ["Scopable", "Class", "Pure", "Expression"],

  "ForOfStatement": ["Scopable", "Statement", "For", "Loop"],
  "ForInStatement": ["Scopable", "Statement", "For", "Loop"],
  "ForStatement":   ["Scopable", "Statement", "For", "Loop"],

  "ObjectPattern":     ["Pattern"],
  "ArrayPattern":      ["Pattern"],
  "AssignmentPattern": ["Pattern"],

  "Property":   ["UserWhitespacable"],

  "ArrayExpression":           ["Expression"],
  "AssignmentExpression":      ["Expression"],
  "AwaitExpression":           ["Expression", "Terminatorless"],
  "CallExpression":            ["Expression"],
  "ComprehensionExpression":   ["Expression", "Scopable"],
  "ConditionalExpression":     ["Expression"],
  "DoExpression":              ["Expression"],
  "Identifier":                ["Expression"],
  "Literal":                   ["Expression", "Pure"],
  "MemberExpression":          ["Expression"],
  "MetaProperty":              ["Expression"],
  "NewExpression":             ["Expression"],
  "ObjectExpression":          ["Expression"],
  "SequenceExpression":        ["Expression"],
  "TaggedTemplateExpression":  ["Expression"],
  "ThisExpression":            ["Expression"],
  "Super":                     ["Expression"],
  "UpdateExpression":          ["Expression"],
  "JSXEmptyExpression":        ["Expression"],
  "JSXMemberExpression":       ["Expression"],
  "YieldExpression":           ["Expression", "Terminatorless"],

  "AnyTypeAnnotation":           ["Flow"],
  "ArrayTypeAnnotation":         ["Flow"],
  "BooleanTypeAnnotation":       ["Flow"],
  "ClassImplements":             ["Flow"],
  "DeclareClass":                ["Flow", "Statement"],
  "DeclareFunction":             ["Flow", "Statement"],
  "DeclareModule":               ["Flow", "Statement"],
  "DeclareVariable":             ["Flow", "Statement"],
  "FunctionTypeAnnotation":      ["Flow"],
  "FunctionTypeParam":           ["Flow"],
  "GenericTypeAnnotation":       ["Flow"],
  "InterfaceExtends":            ["Flow"],
  "InterfaceDeclaration":        ["Flow", "Statement", "Declaration"],
  "IntersectionTypeAnnotation":  ["Flow"],
  "NullableTypeAnnotation":      ["Flow"],
  "NumberTypeAnnotation":        ["Flow"],
  "StringLiteralTypeAnnotation": ["Flow"],
  "StringTypeAnnotation":        ["Flow"],
  "TupleTypeAnnotation":         ["Flow"],
  "TypeofTypeAnnotation":        ["Flow"],
  "TypeAlias":                   ["Flow", "Statement"],
  "TypeAnnotation":              ["Flow"],
  "TypeCastExpression":          ["Flow"],
  "TypeParameterDeclaration":    ["Flow"],
  "TypeParameterInstantiation":  ["Flow"],
  "ObjectTypeAnnotation":        ["Flow"],
  "ObjectTypeCallProperty":      ["Flow", "UserWhitespacable"],
  "ObjectTypeIndexer":           ["Flow", "UserWhitespacable"],
  "ObjectTypeProperty":          ["Flow", "UserWhitespacable"],
  "QualifiedTypeIdentifier":     ["Flow"],
  "UnionTypeAnnotation":         ["Flow"],
  "VoidTypeAnnotation":          ["Flow"],

  "JSXAttribute":           ["JSX", "Immutable"],
  "JSXClosingElement":      ["JSX", "Immutable"],
  "JSXElement":             ["JSX", "Immutable", "Expression"],
  "JSXEmptyExpression":     ["JSX", "Immutable"],
  "JSXExpressionContainer": ["JSX", "Immutable"],
  "JSXIdentifier":          ["JSX"],
  "JSXMemberExpression":    ["JSX"],
  "JSXNamespacedName":      ["JSX"],
  "JSXOpeningElement":      ["JSX", "Immutable"],
  "JSXSpreadAttribute":     ["JSX"]
}

},{}],165:[function(require,module,exports){
module.exports={
  "ArrayExpression": {
    "elements": null
  },

  "ArrowFunctionExpression": {
    "params": null,
    "body": null
  },

  "AssignmentExpression": {
    "operator": null,
    "left": null,
    "right": null
  },

  "BinaryExpression": {
    "operator": null,
    "left": null,
    "right": null
  },

  "BlockStatement": {
    "body": null
  },

  "CallExpression": {
    "callee": null,
    "arguments": null
  },

  "ConditionalExpression": {
    "test": null,
    "consequent": null,
    "alternate": null
  },

  "ExpressionStatement": {
    "expression": null
  },

  "File": {
    "program": null,
    "comments": null,
    "tokens": null
  },

  "FunctionExpression": {
    "id": null,
    "params": null,
    "body": null,
    "generator": false,
    "async": false
  },

  "FunctionDeclaration": {
    "id": null,
    "params": null,
    "body": null,
    "generator": false,
    "async": false
  },

  "GenericTypeAnnotation": {
    "id": null,
    "typeParameters": null
  },

  "Identifier": {
    "name": null
  },

  "IfStatement": {
    "test": null,
    "consequent": null,
    "alternate": null
  },

  "ImportDeclaration": {
    "specifiers": null,
    "source": null
  },

  "ImportSpecifier": {
    "local": null,
    "imported": null
  },

  "LabeledStatement": {
    "label": null,
    "body": null
  },

  "Literal": {
    "value": null
  },

  "LogicalExpression": {
    "operator": null,
    "left": null,
    "right": null
  },

  "MemberExpression": {
    "object": null,
    "property": null,
    "computed": false
  },

  "MethodDefinition": {
    "key": null,
    "value": null,
    "kind": "method",
    "computed": false,
    "static": false
  },

  "NewExpression": {
    "callee": null,
    "arguments": null
  },

  "ObjectExpression": {
    "properties": null
  },

  "Program": {
    "body": null
  },

  "Property": {
    "kind": null,
    "key": null,
    "value": null,
    "computed": false
  },

  "ReturnStatement": {
    "argument": null
  },

  "SequenceExpression": {
    "expressions": null
  },

  "TemplateLiteral": {
    "quasis": null,
    "expressions": null
  },

  "ThrowExpression": {
    "argument": null
  },

  "UnaryExpression": {
    "operator": null,
    "argument": null,
    "prefix": null
  },

  "VariableDeclaration": {
    "kind": null,
    "declarations": null
  },

  "VariableDeclarator": {
    "id": null,
    "init": null
  },

  "WithStatement": {
    "object": null,
    "body": null
  },

  "YieldExpression": {
    "argument": null,
    "delegate": null
  }
}

},{}],166:[function(require,module,exports){
"use strict";

exports.__esModule = true;

/**
 * Description
 */

exports.toComputedKey = toComputedKey;

/**
 * Turn an array of statement `nodes` into a `SequenceExpression`.
 *
 * Variable declarations are turned into simple assignments and their
 * declarations hoisted to the top of the current scope.
 *
 * Expression statements are just resolved to their expression.
 */

exports.toSequenceExpression = toSequenceExpression;

/**
 * Description
 */

exports.toKeyAlias = toKeyAlias;

/*
 * Description
 */

exports.toIdentifier = toIdentifier;

/**
 * Description
 *
 * @returns {Object|Boolean}
 */

exports.toStatement = toStatement;

/**
 * Description
 */

exports.toExpression = toExpression;

/**
 * Description
 */

exports.toBlock = toBlock;

/**
 * Description
 */

exports.valueToNode = valueToNode;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodashLangIsPlainObject = require("lodash/lang/isPlainObject");

var _lodashLangIsPlainObject2 = _interopRequireDefault(_lodashLangIsPlainObject);

var _lodashLangIsNumber = require("lodash/lang/isNumber");

var _lodashLangIsNumber2 = _interopRequireDefault(_lodashLangIsNumber);

var _lodashLangIsRegExp = require("lodash/lang/isRegExp");

var _lodashLangIsRegExp2 = _interopRequireDefault(_lodashLangIsRegExp);

var _lodashLangIsString = require("lodash/lang/isString");

var _lodashLangIsString2 = _interopRequireDefault(_lodashLangIsString);

var _traversal = require("../traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _index = require("./index");

var t = _interopRequireWildcard(_index);

function toComputedKey(node) {
  var key = arguments[1] === undefined ? node.key || node.property : arguments[1];
  return (function () {
    if (!node.computed) {
      if (t.isIdentifier(key)) key = t.literal(key.name);
    }
    return key;
  })();
}

function toSequenceExpression(nodes, scope) {
  var declars = [];
  var bailed = false;

  var result = convert(nodes);
  if (bailed) return;

  for (var i = 0; i < declars.length; i++) {
    scope.push(declars[i]);
  }

  return result;

  function convert(nodes) {
    var ensureLastUndefined = false;
    var exprs = [];

    var _arr = nodes;
    for (var _i = 0; _i < _arr.length; _i++) {
      var node = _arr[_i];
      if (t.isExpression(node)) {
        exprs.push(node);
      } else if (t.isExpressionStatement(node)) {
        exprs.push(node.expression);
      } else if (t.isVariableDeclaration(node)) {
        if (node.kind !== "var") return bailed = true; // bailed

        var _arr2 = node.declarations;
        for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
          var declar = _arr2[_i2];
          var bindings = t.getBindingIdentifiers(declar);
          for (var key in bindings) {
            declars.push({
              kind: node.kind,
              id: bindings[key]
            });
          }

          if (declar.init) {
            exprs.push(t.assignmentExpression("=", declar.id, declar.init));
          }
        }

        ensureLastUndefined = true;
        continue;
      } else if (t.isIfStatement(node)) {
        var consequent = node.consequent ? convert([node.consequent]) : t.identifier("undefined");
        var alternate = node.alternate ? convert([node.alternate]) : t.identifier("undefined");
        if (!consequent || !alternate) return bailed = true;

        exprs.push(t.conditionalExpression(node.test, consequent, alternate));
      } else if (t.isBlockStatement(node)) {
        exprs.push(convert(node.body));
      } else {
        // bailed, we can't understand this
        return bailed = true;
      }

      ensureLastUndefined = false;
    }

    if (ensureLastUndefined) {
      exprs.push(t.identifier("undefined"));
    }

    //

    if (exprs.length === 1) {
      return exprs[0];
    } else {
      return t.sequenceExpression(exprs);
    }
  }
}

function toKeyAlias(node) {
  var key = arguments[1] === undefined ? node.key : arguments[1];
  return (function () {
    var alias;
    if (t.isIdentifier(key)) {
      alias = key.name;
    } else if (t.isLiteral(key)) {
      alias = JSON.stringify(key.value);
    } else {
      alias = JSON.stringify(_traversal2["default"].removeProperties(t.cloneDeep(key)));
    }
    if (node.computed) alias = "[" + alias + "]";
    return alias;
  })();
}

function toIdentifier(name) {
  if (t.isIdentifier(name)) return name.name;

  name = name + "";

  // replace all non-valid identifiers with dashes
  name = name.replace(/[^a-zA-Z0-9$_]/g, "-");

  // remove all dashes and numbers from start of name
  name = name.replace(/^[-0-9]+/, "");

  // camel case
  name = name.replace(/[-\s]+(.)?/g, function (match, c) {
    return c ? c.toUpperCase() : "";
  });

  if (!t.isValidIdentifier(name)) {
    name = "_" + name;
  }

  return name || "_";
}

function toStatement(node, ignore) {
  if (t.isStatement(node)) {
    return node;
  }

  var mustHaveId = false;
  var newType;

  if (t.isClass(node)) {
    mustHaveId = true;
    newType = "ClassDeclaration";
  } else if (t.isFunction(node)) {
    mustHaveId = true;
    newType = "FunctionDeclaration";
  } else if (t.isAssignmentExpression(node)) {
    return t.expressionStatement(node);
  }

  if (mustHaveId && !node.id) {
    newType = false;
  }

  if (!newType) {
    if (ignore) {
      return false;
    } else {
      throw new Error("cannot turn " + node.type + " to a statement");
    }
  }

  node.type = newType;

  return node;
}

function toExpression(node) {
  if (t.isExpressionStatement(node)) {
    node = node.expression;
  }

  if (t.isClass(node)) {
    node.type = "ClassExpression";
  } else if (t.isFunction(node)) {
    node.type = "FunctionExpression";
  }

  if (t.isExpression(node)) {
    return node;
  } else {
    throw new Error("cannot turn " + node.type + " to an expression");
  }
}

function toBlock(node, parent) {
  if (t.isBlockStatement(node)) {
    return node;
  }

  if (t.isEmptyStatement(node)) {
    node = [];
  }

  if (!Array.isArray(node)) {
    if (!t.isStatement(node)) {
      if (t.isFunction(parent)) {
        node = t.returnStatement(node);
      } else {
        node = t.expressionStatement(node);
      }
    }

    node = [node];
  }

  return t.blockStatement(node);
}

function valueToNode(value) {
  if (value === undefined) {
    return t.identifier("undefined");
  }

  if (value === true || value === false || value === null || (0, _lodashLangIsString2["default"])(value) || (0, _lodashLangIsNumber2["default"])(value) || (0, _lodashLangIsRegExp2["default"])(value)) {
    return t.literal(value);
  }

  if (Array.isArray(value)) {
    return t.arrayExpression(value.map(t.valueToNode));
  }

  if ((0, _lodashLangIsPlainObject2["default"])(value)) {
    var props = [];
    for (var key in value) {
      var nodeKey;
      if (t.isValidIdentifier(key)) {
        nodeKey = t.identifier(key);
      } else {
        nodeKey = t.literal(key);
      }
      props.push(t.property("init", nodeKey, t.valueToNode(value[key])));
    }
    return t.objectExpression(props);
  }

  throw new Error("don't know how to turn this value into a node");
}
},{"../traversal":156,"./index":167,"lodash/collection/each":328,"lodash/lang/isNumber":408,"lodash/lang/isPlainObject":410,"lodash/lang/isRegExp":411,"lodash/lang/isString":412}],167:[function(require,module,exports){
"use strict";

exports.__esModule = true;

/**
 * Returns whether `node` is of given `type`.
 *
 * For better performance, use this instead of `is[Type]` when `type` is unknown.
 * Optionally, pass `skipAliasCheck` to directly compare `node.type` with `type`.
 */

exports.is = is;
exports.isType = isType;

/*
 * Description
 */

exports.shallowEqual = shallowEqual;

/**
 * Description
 */

exports.appendToMemberExpression = appendToMemberExpression;

/**
 * Description
 */

exports.prependToMemberExpression = prependToMemberExpression;

/**
 * Description
 */

exports.ensureBlock = ensureBlock;

/**
 * Description
 */

exports.clone = clone;

/**
 * Description
 */

exports.cloneDeep = cloneDeep;

/**
 * Build a function that when called will return whether or not the
 * input `node` `MemberExpression` matches the input `match`.
 *
 * For example, given the match `React.createClass` it would match the
 * parsed nodes of `React.createClass` and `React["createClass"]`.
 */

exports.buildMatchMemberExpression = buildMatchMemberExpression;

/**
 * Description
 */

exports.removeComments = removeComments;

/**
 * Description
 */

exports.inheritsComments = inheritsComments;

/**
 * Description
 */

exports.inherits = inherits;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _toFastProperties = require("to-fast-properties");

var _toFastProperties2 = _interopRequireDefault(_toFastProperties);

var _lodashArrayCompact = require("lodash/array/compact");

var _lodashArrayCompact2 = _interopRequireDefault(_lodashArrayCompact);

var _lodashObjectAssign = require("lodash/object/assign");

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _lodashCollectionEach = require("lodash/collection/each");

var _lodashCollectionEach2 = _interopRequireDefault(_lodashCollectionEach);

var _lodashArrayUniq = require("lodash/array/uniq");

var _lodashArrayUniq2 = _interopRequireDefault(_lodashArrayUniq);

var t = exports;

/**
 * Registers `is[Type]` and `assert[Type]` generated functions for a given `type`.
 * Pass `skipAliasCheck` to force it to directly compare `node.type` with `type`.
 */

function registerType(type, skipAliasCheck) {
  var is = t["is" + type] = function (node, opts) {
    return t.is(type, node, opts, skipAliasCheck);
  };

  t["assert" + type] = function (node, opts) {
    opts = opts || {};
    if (!is(node, opts)) {
      throw new Error("Expected type " + JSON.stringify(type) + " with option " + JSON.stringify(opts));
    }
  };
}

var STATEMENT_OR_BLOCK_KEYS = ["consequent", "body", "alternate"];
exports.STATEMENT_OR_BLOCK_KEYS = STATEMENT_OR_BLOCK_KEYS;
var NATIVE_TYPE_NAMES = ["Array", "ArrayBuffer", "Boolean", "DataView", "Date", "Error", "EvalError", "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Map", "Number", "Object", "Proxy", "Promise", "RangeError", "ReferenceError", "RegExp", "Set", "String", "Symbol", "SyntaxError", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "URIError", "WeakMap", "WeakSet"];
exports.NATIVE_TYPE_NAMES = NATIVE_TYPE_NAMES;
var FLATTENABLE_KEYS = ["body", "expressions"];
exports.FLATTENABLE_KEYS = FLATTENABLE_KEYS;
var FOR_INIT_KEYS = ["left", "init"];
exports.FOR_INIT_KEYS = FOR_INIT_KEYS;
var COMMENT_KEYS = ["leadingComments", "trailingComments"];

exports.COMMENT_KEYS = COMMENT_KEYS;
var VISITOR_KEYS = require("./visitor-keys");
exports.VISITOR_KEYS = VISITOR_KEYS;
var BUILDER_KEYS = require("./builder-keys");
exports.BUILDER_KEYS = BUILDER_KEYS;
var ALIAS_KEYS = require("./alias-keys");

exports.ALIAS_KEYS = ALIAS_KEYS;
t.FLIPPED_ALIAS_KEYS = {};

(0, _lodashCollectionEach2["default"])(t.VISITOR_KEYS, function (keys, type) {
  registerType(type, true);
});

(0, _lodashCollectionEach2["default"])(t.ALIAS_KEYS, function (aliases, type) {
  (0, _lodashCollectionEach2["default"])(aliases, function (alias) {
    var types = t.FLIPPED_ALIAS_KEYS[alias] = t.FLIPPED_ALIAS_KEYS[alias] || [];
    types.push(type);
  });
});

(0, _lodashCollectionEach2["default"])(t.FLIPPED_ALIAS_KEYS, function (types, type) {
  t[type.toUpperCase() + "_TYPES"] = types;
  registerType(type, false);
});

var TYPES = Object.keys(t.VISITOR_KEYS).concat(Object.keys(t.FLIPPED_ALIAS_KEYS));exports.TYPES = TYPES;

function is(type, node, opts, skipAliasCheck) {
  if (!node) return false;

  var matches = isType(node.type, type);
  if (!matches) return false;

  if (typeof opts === "undefined") {
    return true;
  } else {
    return t.shallowEqual(node, opts);
  }
}

function isType(nodeType, targetType) {
  if (nodeType === targetType) return true;

  var aliases = t.FLIPPED_ALIAS_KEYS[targetType];
  if (aliases) {
    if (aliases[0] === nodeType) return true;

    var _arr = aliases;
    for (var _i = 0; _i < _arr.length; _i++) {
      var alias = _arr[_i];
      if (nodeType === alias) return true;
    }
  }

  return false;
}

(0, _lodashCollectionEach2["default"])(t.VISITOR_KEYS, function (keys, type) {
  if (t.BUILDER_KEYS[type]) return;

  var defs = {};
  (0, _lodashCollectionEach2["default"])(keys, function (key) {
    defs[key] = null;
  });
  t.BUILDER_KEYS[type] = defs;
});

(0, _lodashCollectionEach2["default"])(t.BUILDER_KEYS, function (keys, type) {
  t[type[0].toLowerCase() + type.slice(1)] = function () {
    var node = {};
    node.start = null;
    node.type = type;

    var i = 0;

    for (var key in keys) {
      var arg = arguments[i++];
      if (arg === undefined) arg = keys[key];
      node[key] = arg;
    }

    return node;
  };
});
function shallowEqual(actual, expected) {
  var keys = Object.keys(expected);

  var _arr2 = keys;
  for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
    var key = _arr2[_i2];
    if (actual[key] !== expected[key]) {
      return false;
    }
  }

  return true;
}

function appendToMemberExpression(member, append, computed) {
  member.object = t.memberExpression(member.object, member.property, member.computed);
  member.property = append;
  member.computed = !!computed;
  return member;
}

function prependToMemberExpression(member, append) {
  member.object = t.memberExpression(append, member.object);
  return member;
}

function ensureBlock(node) {
  var key = arguments[1] === undefined ? "body" : arguments[1];

  return node[key] = t.toBlock(node[key], node);
}

function clone(node) {
  var newNode = {};
  for (var key in node) {
    if (key[0] === "_") continue;
    newNode[key] = node[key];
  }
  return newNode;
}

function cloneDeep(node) {
  var newNode = {};

  for (var key in node) {
    if (key[0] === "_") continue;

    var val = node[key];

    if (val) {
      if (val.type) {
        val = t.cloneDeep(val);
      } else if (Array.isArray(val)) {
        val = val.map(t.cloneDeep);
      }
    }

    newNode[key] = val;
  }

  return newNode;
}

function buildMatchMemberExpression(match, allowPartial) {
  var parts = match.split(".");

  return function (member) {
    // not a member expression
    if (!t.isMemberExpression(member)) return false;

    var search = [member];
    var i = 0;

    while (search.length) {
      var node = search.shift();

      if (allowPartial && i === parts.length) {
        return true;
      }

      if (t.isIdentifier(node)) {
        // this part doesn't match
        if (parts[i] !== node.name) return false;
      } else if (t.isLiteral(node)) {
        // this part doesn't match
        if (parts[i] !== node.value) return false;
      } else if (t.isMemberExpression(node)) {
        if (node.computed && !t.isLiteral(node.property)) {
          // we can't deal with this
          return false;
        } else {
          search.push(node.object);
          search.push(node.property);
          continue;
        }
      } else {
        // we can't deal with this
        return false;
      }

      // too many parts
      if (++i > parts.length) {
        return false;
      }
    }

    return true;
  };
}

function removeComments(child) {
  var _arr3 = COMMENT_KEYS;

  for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
    var key = _arr3[_i3];
    delete child[key];
  }
  return child;
}

function inheritsComments(child, parent) {
  if (child && parent) {
    var _arr4 = COMMENT_KEYS;

    for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
      var key = _arr4[_i4];
      child[key] = (0, _lodashArrayUniq2["default"])((0, _lodashArrayCompact2["default"])([].concat(child[key], parent[key])));
    }
  }
  return child;
}

function inherits(child, parent) {
  if (!child || !parent) return child;

  child._scopeInfo = parent._scopeInfo;
  child.range = parent.range;
  child.start = parent.start;
  child.loc = parent.loc;
  child.end = parent.end;

  child.typeAnnotation = parent.typeAnnotation;
  child.returnType = parent.returnType;

  t.inheritsComments(child, parent);
  return child;
}

(0, _toFastProperties2["default"])(t);
(0, _toFastProperties2["default"])(t.VISITOR_KEYS);

exports.__esModule = true;
(0, _lodashObjectAssign2["default"])(t, require("./retrievers"));
(0, _lodashObjectAssign2["default"])(t, require("./validators"));
(0, _lodashObjectAssign2["default"])(t, require("./converters"));
},{"./alias-keys":164,"./builder-keys":165,"./converters":166,"./retrievers":168,"./validators":169,"./visitor-keys":170,"lodash/array/compact":322,"lodash/array/uniq":326,"lodash/collection/each":328,"lodash/object/assign":415,"to-fast-properties":492}],168:[function(require,module,exports){
"use strict";

exports.__esModule = true;

/**
 * Return a list of binding identifiers associated with
 * the input `node`.
 */

exports.getBindingIdentifiers = getBindingIdentifiers;

/**
 * Description
 */

exports.getLastStatements = getLastStatements;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _helpersObject = require("../helpers/object");

var _helpersObject2 = _interopRequireDefault(_helpersObject);

var _index = require("./index");

var t = _interopRequireWildcard(_index);

function getBindingIdentifiers(node) {
  var search = [].concat(node);
  var ids = (0, _helpersObject2["default"])();

  while (search.length) {
    var id = search.shift();
    if (!id) continue;

    var keys = t.getBindingIdentifiers.keys[id.type];

    if (t.isIdentifier(id)) {
      ids[id.name] = id;
    } else if (t.isExportDeclaration(id)) {
      if (t.isDeclaration(node.declaration)) {
        search.push(node.declaration);
      }
    } else if (keys) {
      var _arr = keys;

      for (var _i = 0; _i < _arr.length; _i++) {
        var key = _arr[_i];
        search = search.concat(id[key] || []);
      }
    }
  }

  return ids;
}

getBindingIdentifiers.keys = {
  UnaryExpression: ["argument"],
  AssignmentExpression: ["left"],
  ImportSpecifier: ["local"],
  ImportNamespaceSpecifier: ["local"],
  ImportDefaultSpecifier: ["local"],
  VariableDeclarator: ["id"],
  FunctionDeclaration: ["id"],
  FunctionExpression: ["id"],
  ClassDeclaration: ["id"],
  ClassExpression: ["id"],
  SpreadElement: ["argument"],
  RestElement: ["argument"],
  UpdateExpression: ["argument"],
  SpreadProperty: ["argument"],
  Property: ["value"],
  ComprehensionBlock: ["left"],
  AssignmentPattern: ["left"],
  ComprehensionExpression: ["blocks"],
  ImportDeclaration: ["specifiers"],
  VariableDeclaration: ["declarations"],
  ArrayPattern: ["elements"],
  ObjectPattern: ["properties"]
};
function getLastStatements(node) {
  var nodes = [];

  var add = function add(node) {
    nodes = nodes.concat(getLastStatements(node));
  };

  if (t.isIfStatement(node)) {
    add(node.consequent);
    add(node.alternate);
  } else if (t.isFor(node) || t.isWhile(node)) {
    add(node.body);
  } else if (t.isProgram(node) || t.isBlockStatement(node)) {
    add(node.body[node.body.length - 1]);
  } else if (t.isLoop()) {} else if (node) {
    nodes.push(node);
  }

  return nodes;
}
},{"../helpers/object":44,"./index":167}],169:[function(require,module,exports){
"use strict";

exports.__esModule = true;

/**
 * Check if the input `node` is a reference to a bound variable.
 */

exports.isReferenced = isReferenced;

/**
 * Check if the input `node` is an `Identifier` and `isReferenced`.
 */

exports.isReferencedIdentifier = isReferencedIdentifier;

/**
 * Check if the input `name` is a valid identifier name
 * and isn't a reserved word.
 */

exports.isValidIdentifier = isValidIdentifier;

/**
 * Description
 */

exports.isLet = isLet;

/**
 * Description
 */

exports.isBlockScoped = isBlockScoped;

/**
 * Description
 */

exports.isVar = isVar;

/**
 * Description
 */

exports.isSpecifierDefault = isSpecifierDefault;

/**
 * Description
 */

exports.isScope = isScope;

/**
 * Description
 */

exports.isImmutable = isImmutable;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _esutils = require("esutils");

var _esutils2 = _interopRequireDefault(_esutils);

var _index = require("./index");

var t = _interopRequireWildcard(_index);

function isReferenced(node, parent) {
  switch (parent.type) {
    // yes: PARENT[NODE]
    // yes: NODE.child
    // no: parent.CHILD
    case "MemberExpression":
      if (parent.property === node && parent.computed) {
        return true;
      } else if (parent.object === node) {
        return true;
      } else {
        return false;
      }

    // no: new.NODE
    // no: NODE.target
    case "MetaProperty":
      return false;

    // yes: { [NODE]: "" }
    // yes: { NODE }
    // no: { NODE: "" }
    case "Property":
      if (parent.key === node) {
        return parent.computed;
      }

    // no: var NODE = init;
    // yes: var id = NODE;
    case "VariableDeclarator":
      return parent.id !== node;

    // no: function NODE() {}
    // no: function foo(NODE) {}
    case "ArrowFunctionExpression":
    case "FunctionDeclaration":
    case "FunctionExpression":
      var _arr = parent.params;

      for (var _i = 0; _i < _arr.length; _i++) {
        var param = _arr[_i];
        if (param === node) return false;
      }

      return parent.id !== node;

    // no: export { foo as NODE };
    // yes: export { NODE as foo };
    // no: export { NODE as foo } from "foo";
    case "ExportSpecifier":
      if (parent.source) {
        return false;
      } else {
        return parent.local === node;
      }

    // no: import NODE from "foo";
    case "ImportDefaultSpecifier":
      return false;

    // no: import * as NODE from "foo";
    case "ImportNamespaceSpecifier":
      return false;

    // no: import { NODE as foo } from "foo";
    // no: import { foo as NODE } from "foo";
    case "ImportSpecifier":
      return false;

    // no: class NODE {}
    case "ClassDeclaration":
    case "ClassExpression":
      return parent.id !== node;

    // yes: class { [NODE](){} }
    case "MethodDefinition":
      return parent.key === node && parent.computed;

    // no: NODE: for (;;) {}
    case "LabeledStatement":
      return false;

    // no: try {} catch (NODE) {}
    case "CatchClause":
      return parent.param !== node;

    // no: function foo(...NODE) {}
    case "RestElement":
      return false;

    // no: [NODE = foo] = [];
    // yes: [foo = NODE] = [];
    case "AssignmentPattern":
      return parent.right === node;

    // no: [NODE] = [];
    // no: ({ NODE }) = [];
    case "ObjectPattern":
    case "ArrayPattern":
      return false;

    // no: import NODE from "bar";
    case "ImportSpecifier":
      return false;

    // no: import * as NODE from "foo";
    case "ImportNamespaceSpecifier":
      return false;
  }

  return true;
}

function isReferencedIdentifier(node, parent, opts) {
  return (t.isIdentifier(node, opts) || t.isJSXIdentifier(node, opts)) && t.isReferenced(node, parent);
}

function isValidIdentifier(name) {
  if (typeof name !== "string" || _esutils2["default"].keyword.isReservedWordES6(name, true)) {
    return false;
  } else {
    return _esutils2["default"].keyword.isIdentifierNameES6(name);
  }
}

function isLet(node) {
  return t.isVariableDeclaration(node) && (node.kind !== "var" || node._let);
}

function isBlockScoped(node) {
  return t.isFunctionDeclaration(node) || t.isClassDeclaration(node) || t.isLet(node);
}

function isVar(node) {
  return t.isVariableDeclaration(node, { kind: "var" }) && !node._let;
}

function isSpecifierDefault(specifier) {
  return t.isImportDefaultSpecifier(specifier) || t.isExportDefaultSpecifier(specifier) || t.isIdentifier(specifier.imported || specifier.exported, { name: "default" });
}

function isScope(node, parent) {
  if (t.isBlockStatement(node) && t.isFunction(parent, { body: node })) {
    return false;
  }

  return t.isScopable(node);
}

function isImmutable(node) {
  if (t.isType(node.type, "Immutable")) return true;

  if (t.isLiteral(node)) {
    if (node.regex) {
      // regexes are mutable
      return false;
    } else {
      // immutable!
      return true;
    }
  } else if (t.isIdentifier(node)) {
    if (node.name === "undefined") {
      // immutable!
      return true;
    } else {
      // no idea...
      return false;
    }
  }

  return false;
}
},{"./index":167,"esutils":312}],170:[function(require,module,exports){
module.exports={
  "ArrayExpression":           ["elements"],
  "ArrayPattern":              ["elements", "typeAnnotation"],
  "ArrowFunctionExpression":   ["params", "body", "returnType"],
  "AssignmentExpression":      ["left", "right"],
  "AssignmentPattern":         ["left", "right"],
  "AwaitExpression":           ["argument"],
  "BinaryExpression":          ["left", "right"],
  "BlockStatement":            ["body"],
  "BreakStatement":            ["label"],
  "CallExpression":            ["callee", "arguments"],
  "CatchClause":               ["param", "body"],
  "ClassBody":                 ["body"],
  "ClassDeclaration":          ["id", "body", "superClass", "typeParameters", "superTypeParameters", "implements", "decorators"],
  "ClassExpression":           ["id", "body", "superClass", "typeParameters", "superTypeParameters", "implements", "decorators"],
  "ComprehensionBlock":        ["left", "right", "body"],
  "ComprehensionExpression":   ["filter", "blocks", "body"],
  "ConditionalExpression":     ["test", "consequent", "alternate"],
  "ContinueStatement":         ["label"],
  "Decorator":                 ["expression"],
  "DebuggerStatement":         [],
  "DoWhileStatement":          ["body", "test"],
  "DoExpression":              ["body"],
  "EmptyStatement":            [],
  "ExpressionStatement":       ["expression"],
  "File":                      ["program"],
  "ForInStatement":            ["left", "right", "body"],
  "ForOfStatement":            ["left", "right", "body"],
  "ForStatement":              ["init", "test", "update", "body"],
  "FunctionDeclaration":       ["id", "params", "body", "returnType", "typeParameters"],
  "FunctionExpression":        ["id", "params", "body", "returnType", "typeParameters"],
  "Identifier":                ["typeAnnotation"],
  "IfStatement":               ["test", "consequent", "alternate"],
  "ImportDefaultSpecifier":    ["local"],
  "ImportNamespaceSpecifier":  ["local"],
  "ImportDeclaration":         ["specifiers", "source"],
  "ImportSpecifier":           ["imported", "local"],
  "LabeledStatement":          ["label", "body"],
  "Literal":                   [],
  "LogicalExpression":         ["left", "right"],
  "MemberExpression":          ["object", "property"],
  "MetaProperty":              ["meta", "property"],
  "MethodDefinition":          ["key", "value", "decorators"],
  "NewExpression":             ["callee", "arguments"],
  "ObjectExpression":          ["properties"],
  "ObjectPattern":             ["properties", "typeAnnotation"],
  "Program":                   ["body"],
  "Property":                  ["key", "value", "decorators"],
  "RestElement":               ["argument", "typeAnnotation"],
  "ReturnStatement":           ["argument"],
  "SequenceExpression":        ["expressions"],
  "SpreadElement":             ["argument"],
  "SpreadProperty":            ["argument"],
  "Super":                     [],
  "SwitchCase":                ["test", "consequent"],
  "SwitchStatement":           ["discriminant", "cases"],
  "TaggedTemplateExpression":  ["tag", "quasi"],
  "TemplateElement":           [],
  "TemplateLiteral":           ["quasis", "expressions"],
  "ThisExpression":            [],
  "ThrowStatement":            ["argument"],
  "TryStatement":              ["block", "handlers", "handler", "guardedHandlers", "finalizer"],
  "UnaryExpression":           ["argument"],
  "UpdateExpression":          ["argument"],
  "VariableDeclaration":       ["declarations"],
  "VariableDeclarator":        ["id", "init"],
  "WhileStatement":            ["test", "body"],
  "WithStatement":             ["object", "body"],
  "YieldExpression":           ["argument"],

  "ExportAllDeclaration":       ["source", "exported"],
  "ExportDefaultDeclaration":   ["declaration"],
  "ExportNamedDeclaration":     ["declaration", "specifiers", "source"],
  "ExportDefaultSpecifier":     ["exported"],
  "ExportNamespaceSpecifier":   ["exported"],
  "ExportSpecifier":            ["local", "exported"],

  "AnyTypeAnnotation":           [],
  "ArrayTypeAnnotation":         ["elementType"],
  "BooleanTypeAnnotation":       [],
  "ClassImplements":             ["id", "typeParameters"],
  "ClassProperty":               ["key", "value", "typeAnnotation", "decorators"],
  "DeclareClass":                ["id", "typeParameters", "extends", "body"],
  "DeclareFunction":             ["id"],
  "DeclareModule":               ["id", "body"],
  "DeclareVariable":             ["id"],
  "FunctionTypeAnnotation":      ["typeParameters", "params", "rest", "returnType"],
  "FunctionTypeParam":           ["name", "typeAnnotation"],
  "GenericTypeAnnotation":       ["id", "typeParameters"],
  "InterfaceExtends":            ["id", "typeParameters"],
  "InterfaceDeclaration":        ["id", "typeParameters", "extends", "body"],
  "IntersectionTypeAnnotation":  ["types"],
  "NullableTypeAnnotation":      ["typeAnnotation"],
  "NumberTypeAnnotation":        [],
  "StringLiteralTypeAnnotation": [],
  "StringTypeAnnotation":        [],
  "TupleTypeAnnotation":         ["types"],
  "TypeofTypeAnnotation":        ["argument"],
  "TypeAlias":                   ["id", "typeParameters", "right"],
  "TypeAnnotation":              ["typeAnnotation"],
  "TypeCastExpression":          ["expression", "typeAnnotation"],
  "TypeParameterDeclaration":    ["params"],
  "TypeParameterInstantiation":  ["params"],
  "ObjectTypeAnnotation":        ["properties", "indexers", "callProperties"],
  "ObjectTypeCallProperty":      ["value"],
  "ObjectTypeIndexer":           ["id", "key", "value"],
  "ObjectTypeProperty":          ["key", "value"],
  "QualifiedTypeIdentifier":     ["id", "qualification"],
  "UnionTypeAnnotation":         ["types"],
  "VoidTypeAnnotation":          [],

  "JSXAttribute":              ["name", "value"],
  "JSXClosingElement":         ["name"],
  "JSXElement":                ["openingElement", "closingElement", "children"],
  "JSXEmptyExpression":        [],
  "JSXExpressionContainer":    ["expression"],
  "JSXIdentifier":             [],
  "JSXMemberExpression":       ["object", "property"],
  "JSXNamespacedName":         ["namespace", "name"],
  "JSXOpeningElement":         ["name", "attributes"],
  "JSXSpreadAttribute":        ["argument"]
}

},{}],171:[function(require,module,exports){
(function (process,__dirname){
"use strict";

exports.__esModule = true;
exports.canCompile = canCompile;
exports.resolve = resolve;
exports.resolveRelative = resolveRelative;
exports.list = list;
exports.regexify = regexify;
exports.arrayify = arrayify;
exports.booleanify = booleanify;
exports.shouldIgnore = shouldIgnore;

//

exports.template = template;
exports.parseTemplate = parseTemplate;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("./patch");

var _lodashStringEscapeRegExp = require("lodash/string/escapeRegExp");

var _lodashStringEscapeRegExp2 = _interopRequireDefault(_lodashStringEscapeRegExp);

var _lodashLangCloneDeep = require("lodash/lang/cloneDeep");

var _lodashLangCloneDeep2 = _interopRequireDefault(_lodashLangCloneDeep);

var _lodashLangIsBoolean = require("lodash/lang/isBoolean");

var _lodashLangIsBoolean2 = _interopRequireDefault(_lodashLangIsBoolean);

var _messages = require("./messages");

var messages = _interopRequireWildcard(_messages);

var _minimatch = require("minimatch");

var _minimatch2 = _interopRequireDefault(_minimatch);

var _lodashCollectionContains = require("lodash/collection/contains");

var _lodashCollectionContains2 = _interopRequireDefault(_lodashCollectionContains);

var _traversal = require("./traversal");

var _traversal2 = _interopRequireDefault(_traversal);

var _lodashLangIsString = require("lodash/lang/isString");

var _lodashLangIsString2 = _interopRequireDefault(_lodashLangIsString);

var _lodashLangIsRegExp = require("lodash/lang/isRegExp");

var _lodashLangIsRegExp2 = _interopRequireDefault(_lodashLangIsRegExp);

var _module2 = require("module");

var _module3 = _interopRequireDefault(_module2);

var _lodashLangIsEmpty = require("lodash/lang/isEmpty");

var _lodashLangIsEmpty2 = _interopRequireDefault(_lodashLangIsEmpty);

var _helpersParse = require("./helpers/parse");

var _helpersParse2 = _interopRequireDefault(_helpersParse);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _lodashObjectHas = require("lodash/object/has");

var _lodashObjectHas2 = _interopRequireDefault(_lodashObjectHas);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _types = require("./types");

var t = _interopRequireWildcard(_types);

var _slash = require("slash");

var _slash2 = _interopRequireDefault(_slash);

var _util = require("util");

exports.inherits = _util.inherits;
exports.inspect = _util.inspect;

function canCompile(filename, altExts) {
  var exts = altExts || canCompile.EXTENSIONS;
  var ext = _path2["default"].extname(filename);
  return (0, _lodashCollectionContains2["default"])(exts, ext);
}

canCompile.EXTENSIONS = [".js", ".jsx", ".es6", ".es"];

function resolve(loc) {
  try {
    return require.resolve(loc);
  } catch (err) {
    return null;
  }
}

var relativeMod;

function resolveRelative(loc) {
  // we're in the browser, probably
  if (typeof _module3["default"] === "object") return null;

  if (!relativeMod) {
    relativeMod = new _module3["default"]();
    relativeMod.paths = _module3["default"]._nodeModulePaths(process.cwd());
  }

  try {
    return _module3["default"]._resolveFilename(loc, relativeMod);
  } catch (err) {
    return null;
  }
}

function list(val) {
  if (!val) {
    return [];
  } else if (Array.isArray(val)) {
    return val;
  } else if (typeof val === "string") {
    return val.split(",");
  } else {
    return [val];
  }
}

function regexify(val) {
  if (!val) return new RegExp(/.^/);
  if (Array.isArray(val)) val = new RegExp(val.map(_lodashStringEscapeRegExp2["default"]).join("|"), "i");
  if ((0, _lodashLangIsString2["default"])(val)) return _minimatch2["default"].makeRe(val, { nocase: true });
  if ((0, _lodashLangIsRegExp2["default"])(val)) return val;
  throw new TypeError("illegal type for regexify");
}

function arrayify(val, mapFn) {
  if (!val) return [];
  if ((0, _lodashLangIsBoolean2["default"])(val)) return arrayify([val], mapFn);
  if ((0, _lodashLangIsString2["default"])(val)) return arrayify(list(val), mapFn);

  if (Array.isArray(val)) {
    if (mapFn) val = val.map(mapFn);
    return val;
  }

  return [val];
}

function booleanify(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  return val;
}

function shouldIgnore(filename, ignore, only) {
  filename = (0, _slash2["default"])(filename);
  if (only.length) {
    var _arr = only;

    for (var _i = 0; _i < _arr.length; _i++) {
      var pattern = _arr[_i];
      if (pattern.test(filename)) return false;
    }
    return true;
  } else if (ignore.length) {
    var _arr2 = ignore;

    for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
      var pattern = _arr2[_i2];
      if (pattern.test(filename)) return true;
    }
  }

  return false;
}

var templateVisitor = {
  enter: function enter(node, parent, scope, nodes) {
    if (t.isExpressionStatement(node)) {
      node = node.expression;
    }

    if (t.isIdentifier(node) && (0, _lodashObjectHas2["default"])(nodes, node.name)) {
      this.skip();
      this.replaceInline(nodes[node.name]);
    }
  }
};
function template(name, nodes, keepExpression) {
  var ast = exports.templates[name];
  if (!ast) throw new ReferenceError("unknown template " + name);

  if (nodes === true) {
    keepExpression = true;
    nodes = null;
  }

  ast = (0, _lodashLangCloneDeep2["default"])(ast);

  if (!(0, _lodashLangIsEmpty2["default"])(nodes)) {
    (0, _traversal2["default"])(ast, templateVisitor, null, nodes);
  }

  if (ast.body.length > 1) return ast.body;

  var node = ast.body[0];

  if (!keepExpression && t.isExpressionStatement(node)) {
    return node.expression;
  } else {
    return node;
  }
}

function parseTemplate(loc, code) {
  var ast = (0, _helpersParse2["default"])(code, { filename: loc, looseModules: true }).program;
  ast = _traversal2["default"].removeProperties(ast);
  return ast;
}

function loadTemplates() {
  var templates = {};

  var templatesLoc = _path2["default"].join(__dirname, "transformation/templates");
  if (!_fs2["default"].existsSync(templatesLoc)) {
    throw new ReferenceError(messages.get("missingTemplatesDirectory"));
  }

  var _arr3 = _fs2["default"].readdirSync(templatesLoc);

  for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
    var name = _arr3[_i3];
    if (name[0] === ".") return;

    var key = _path2["default"].basename(name, _path2["default"].extname(name));
    var loc = _path2["default"].join(templatesLoc, name);
    var code = _fs2["default"].readFileSync(loc, "utf8");

    templates[key] = parseTemplate(loc, code);
  }

  return templates;
}

try {
  exports.templates = require("../../templates.json");
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") throw err;
  exports.templates = loadTemplates();
}
}).call(this,require('_process'),"/lib/babel")
},{"../../templates.json":495,"./helpers/parse":45,"./messages":46,"./patch":47,"./traversal":156,"./types":167,"_process":198,"fs":187,"lodash/collection/contains":327,"lodash/lang/cloneDeep":401,"lodash/lang/isBoolean":404,"lodash/lang/isEmpty":405,"lodash/lang/isRegExp":411,"lodash/lang/isString":412,"lodash/object/has":418,"lodash/string/escapeRegExp":423,"minimatch":427,"module":187,"path":197,"slash":479,"util":214}],172:[function(require,module,exports){
'use strict';

module.exports = function(acorn) {
  var tt = acorn.tokTypes;
  var tc = acorn.tokContexts;

  tc.j_oTag = new acorn.TokContext('<tag', false);
  tc.j_cTag = new acorn.TokContext('</tag', false);
  tc.j_expr = new acorn.TokContext('<tag>...</tag>', true, true);

  tt.jsxName = new acorn.TokenType('jsxName');
  tt.jsxText = new acorn.TokenType('jsxText', {beforeExpr: true});
  tt.jsxTagStart = new acorn.TokenType('jsxTagStart');
  tt.jsxTagEnd = new acorn.TokenType('jsxTagEnd');

  tt.jsxTagStart.updateContext = function() {
    this.context.push(tc.j_expr); // treat as beginning of JSX expression
    this.context.push(tc.j_oTag); // start opening tag context
    this.exprAllowed = false;
  };
  tt.jsxTagEnd.updateContext = function(prevType) {
    var out = this.context.pop();
    if (out === tc.j_oTag && prevType === tt.slash || out === tc.j_cTag) {
      this.context.pop();
      this.exprAllowed = this.curContext() === tc.j_expr;
    } else {
      this.exprAllowed = true;
    }
  };

  var pp = acorn.Parser.prototype;

  // Reads inline JSX contents token.

  pp.jsx_readToken = function() {
    var out = '', chunkStart = this.pos;
    for (;;) {
      if (this.pos >= this.input.length)
        this.raise(this.start, 'Unterminated JSX contents');
      var ch = this.input.charCodeAt(this.pos);

      switch (ch) {
      case 60: // '<'
      case 123: // '{'
        if (this.pos === this.start) {
          if (ch === 60 && this.exprAllowed) {
            ++this.pos;
            return this.finishToken(tt.jsxTagStart);
          }
          return this.getTokenFromCode(ch);
        }
        out += this.input.slice(chunkStart, this.pos);
        return this.finishToken(tt.jsxText, out);

      case 38: // '&'
        out += this.input.slice(chunkStart, this.pos);
        out += this.jsx_readEntity();
        chunkStart = this.pos;
        break;

      default:
        if (acorn.isNewLine(ch)) {
          out += this.input.slice(chunkStart, this.pos);
          ++this.pos;
          if (ch === 13 && this.input.charCodeAt(this.pos) === 10) {
            ++this.pos;
            out += '\n';
          } else {
            out += String.fromCharCode(ch);
          }
          if (this.options.locations) {
            ++this.curLine;
            this.lineStart = this.pos;
          }
          chunkStart = this.pos;
        } else {
          ++this.pos;
        }
      }
    }
  };

  pp.jsx_readString = function(quote) {
    var out = '', chunkStart = ++this.pos;
    for (;;) {
      if (this.pos >= this.input.length)
        this.raise(this.start, 'Unterminated string constant');
      var ch = this.input.charCodeAt(this.pos);
      if (ch === quote) break;
      if (ch === 38) { // '&'
        out += this.input.slice(chunkStart, this.pos);
        out += this.jsx_readEntity();
        chunkStart = this.pos;
      } else {
        ++this.pos;
      }
    }
    out += this.input.slice(chunkStart, this.pos++);
    return this.finishToken(tt.string, out);
  };

  var XHTMLEntities = {
    quot: '\u0022',
    amp: '&',
    apos: '\u0027',
    lt: '<',
    gt: '>',
    nbsp: '\u00A0',
    iexcl: '\u00A1',
    cent: '\u00A2',
    pound: '\u00A3',
    curren: '\u00A4',
    yen: '\u00A5',
    brvbar: '\u00A6',
    sect: '\u00A7',
    uml: '\u00A8',
    copy: '\u00A9',
    ordf: '\u00AA',
    laquo: '\u00AB',
    not: '\u00AC',
    shy: '\u00AD',
    reg: '\u00AE',
    macr: '\u00AF',
    deg: '\u00B0',
    plusmn: '\u00B1',
    sup2: '\u00B2',
    sup3: '\u00B3',
    acute: '\u00B4',
    micro: '\u00B5',
    para: '\u00B6',
    middot: '\u00B7',
    cedil: '\u00B8',
    sup1: '\u00B9',
    ordm: '\u00BA',
    raquo: '\u00BB',
    frac14: '\u00BC',
    frac12: '\u00BD',
    frac34: '\u00BE',
    iquest: '\u00BF',
    Agrave: '\u00C0',
    Aacute: '\u00C1',
    Acirc: '\u00C2',
    Atilde: '\u00C3',
    Auml: '\u00C4',
    Aring: '\u00C5',
    AElig: '\u00C6',
    Ccedil: '\u00C7',
    Egrave: '\u00C8',
    Eacute: '\u00C9',
    Ecirc: '\u00CA',
    Euml: '\u00CB',
    Igrave: '\u00CC',
    Iacute: '\u00CD',
    Icirc: '\u00CE',
    Iuml: '\u00CF',
    ETH: '\u00D0',
    Ntilde: '\u00D1',
    Ograve: '\u00D2',
    Oacute: '\u00D3',
    Ocirc: '\u00D4',
    Otilde: '\u00D5',
    Ouml: '\u00D6',
    times: '\u00D7',
    Oslash: '\u00D8',
    Ugrave: '\u00D9',
    Uacute: '\u00DA',
    Ucirc: '\u00DB',
    Uuml: '\u00DC',
    Yacute: '\u00DD',
    THORN: '\u00DE',
    szlig: '\u00DF',
    agrave: '\u00E0',
    aacute: '\u00E1',
    acirc: '\u00E2',
    atilde: '\u00E3',
    auml: '\u00E4',
    aring: '\u00E5',
    aelig: '\u00E6',
    ccedil: '\u00E7',
    egrave: '\u00E8',
    eacute: '\u00E9',
    ecirc: '\u00EA',
    euml: '\u00EB',
    igrave: '\u00EC',
    iacute: '\u00ED',
    icirc: '\u00EE',
    iuml: '\u00EF',
    eth: '\u00F0',
    ntilde: '\u00F1',
    ograve: '\u00F2',
    oacute: '\u00F3',
    ocirc: '\u00F4',
    otilde: '\u00F5',
    ouml: '\u00F6',
    divide: '\u00F7',
    oslash: '\u00F8',
    ugrave: '\u00F9',
    uacute: '\u00FA',
    ucirc: '\u00FB',
    uuml: '\u00FC',
    yacute: '\u00FD',
    thorn: '\u00FE',
    yuml: '\u00FF',
    OElig: '\u0152',
    oelig: '\u0153',
    Scaron: '\u0160',
    scaron: '\u0161',
    Yuml: '\u0178',
    fnof: '\u0192',
    circ: '\u02C6',
    tilde: '\u02DC',
    Alpha: '\u0391',
    Beta: '\u0392',
    Gamma: '\u0393',
    Delta: '\u0394',
    Epsilon: '\u0395',
    Zeta: '\u0396',
    Eta: '\u0397',
    Theta: '\u0398',
    Iota: '\u0399',
    Kappa: '\u039A',
    Lambda: '\u039B',
    Mu: '\u039C',
    Nu: '\u039D',
    Xi: '\u039E',
    Omicron: '\u039F',
    Pi: '\u03A0',
    Rho: '\u03A1',
    Sigma: '\u03A3',
    Tau: '\u03A4',
    Upsilon: '\u03A5',
    Phi: '\u03A6',
    Chi: '\u03A7',
    Psi: '\u03A8',
    Omega: '\u03A9',
    alpha: '\u03B1',
    beta: '\u03B2',
    gamma: '\u03B3',
    delta: '\u03B4',
    epsilon: '\u03B5',
    zeta: '\u03B6',
    eta: '\u03B7',
    theta: '\u03B8',
    iota: '\u03B9',
    kappa: '\u03BA',
    lambda: '\u03BB',
    mu: '\u03BC',
    nu: '\u03BD',
    xi: '\u03BE',
    omicron: '\u03BF',
    pi: '\u03C0',
    rho: '\u03C1',
    sigmaf: '\u03C2',
    sigma: '\u03C3',
    tau: '\u03C4',
    upsilon: '\u03C5',
    phi: '\u03C6',
    chi: '\u03C7',
    psi: '\u03C8',
    omega: '\u03C9',
    thetasym: '\u03D1',
    upsih: '\u03D2',
    piv: '\u03D6',
    ensp: '\u2002',
    emsp: '\u2003',
    thinsp: '\u2009',
    zwnj: '\u200C',
    zwj: '\u200D',
    lrm: '\u200E',
    rlm: '\u200F',
    ndash: '\u2013',
    mdash: '\u2014',
    lsquo: '\u2018',
    rsquo: '\u2019',
    sbquo: '\u201A',
    ldquo: '\u201C',
    rdquo: '\u201D',
    bdquo: '\u201E',
    dagger: '\u2020',
    Dagger: '\u2021',
    bull: '\u2022',
    hellip: '\u2026',
    permil: '\u2030',
    prime: '\u2032',
    Prime: '\u2033',
    lsaquo: '\u2039',
    rsaquo: '\u203A',
    oline: '\u203E',
    frasl: '\u2044',
    euro: '\u20AC',
    image: '\u2111',
    weierp: '\u2118',
    real: '\u211C',
    trade: '\u2122',
    alefsym: '\u2135',
    larr: '\u2190',
    uarr: '\u2191',
    rarr: '\u2192',
    darr: '\u2193',
    harr: '\u2194',
    crarr: '\u21B5',
    lArr: '\u21D0',
    uArr: '\u21D1',
    rArr: '\u21D2',
    dArr: '\u21D3',
    hArr: '\u21D4',
    forall: '\u2200',
    part: '\u2202',
    exist: '\u2203',
    empty: '\u2205',
    nabla: '\u2207',
    isin: '\u2208',
    notin: '\u2209',
    ni: '\u220B',
    prod: '\u220F',
    sum: '\u2211',
    minus: '\u2212',
    lowast: '\u2217',
    radic: '\u221A',
    prop: '\u221D',
    infin: '\u221E',
    ang: '\u2220',
    and: '\u2227',
    or: '\u2228',
    cap: '\u2229',
    cup: '\u222A',
    'int': '\u222B',
    there4: '\u2234',
    sim: '\u223C',
    cong: '\u2245',
    asymp: '\u2248',
    ne: '\u2260',
    equiv: '\u2261',
    le: '\u2264',
    ge: '\u2265',
    sub: '\u2282',
    sup: '\u2283',
    nsub: '\u2284',
    sube: '\u2286',
    supe: '\u2287',
    oplus: '\u2295',
    otimes: '\u2297',
    perp: '\u22A5',
    sdot: '\u22C5',
    lceil: '\u2308',
    rceil: '\u2309',
    lfloor: '\u230A',
    rfloor: '\u230B',
    lang: '\u2329',
    rang: '\u232A',
    loz: '\u25CA',
    spades: '\u2660',
    clubs: '\u2663',
    hearts: '\u2665',
    diams: '\u2666'
  };

  var hexNumber = /^[\da-fA-F]+$/;
  var decimalNumber = /^\d+$/;

  pp.jsx_readEntity = function() {
    var str = '', count = 0, entity;
    var ch = this.input[this.pos];
    if (ch !== '&')
      this.raise(this.pos, 'Entity must start with an ampersand');
    var startPos = ++this.pos;
    while (this.pos < this.input.length && count++ < 10) {
      ch = this.input[this.pos++];
      if (ch === ';') {
        if (str[0] === '#') {
          if (str[1] === 'x') {
            str = str.substr(2);
            if (hexNumber.test(str))
              entity = String.fromCharCode(parseInt(str, 16));
          } else {
            str = str.substr(1);
            if (decimalNumber.test(str))
              entity = String.fromCharCode(parseInt(str, 10));
          }
        } else {
          entity = XHTMLEntities[str];
        }
        break;
      }
      str += ch;
    }
    if (!entity) {
      this.pos = startPos;
      return '&';
    }
    return entity;
  };


  // Read a JSX identifier (valid tag or attribute name).
  //
  // Optimized version since JSX identifiers can't contain
  // escape characters and so can be read as single slice.
  // Also assumes that first character was already checked
  // by isIdentifierStart in readToken.

  pp.jsx_readWord = function() {
    var ch, start = this.pos;
    do {
      ch = this.input.charCodeAt(++this.pos);
    } while (acorn.isIdentifierChar(ch) || ch === 45); // '-'
    return this.finishToken(tt.jsxName, this.input.slice(start, this.pos));
  };

  // Transforms JSX element name to string.

  function getQualifiedJSXName(object) {
    if (object.type === 'JSXIdentifier')
      return object.name;

    if (object.type === 'JSXNamespacedName')
      return object.namespace.name + ':' + object.name.name;

    if (object.type === 'JSXMemberExpression')
      return getQualifiedJSXName(object.object) + '.' +
      getQualifiedJSXName(object.property);
  }

  // Parse next token as JSX identifier

  pp.jsx_parseIdentifier = function() {
    var node = this.startNode();
    if (this.type === tt.jsxName)
      node.name = this.value;
    else if (this.type.keyword)
      node.name = this.type.keyword;
    else
      this.unexpected();
    this.next();
    return this.finishNode(node, 'JSXIdentifier');
  };

  // Parse namespaced identifier.

  pp.jsx_parseNamespacedName = function() {
    var start = this.markPosition();
    var name = this.jsx_parseIdentifier();
    if (!this.eat(tt.colon)) return name;
    var node = this.startNodeAt(start);
    node.namespace = name;
    node.name = this.jsx_parseIdentifier();
    return this.finishNode(node, 'JSXNamespacedName');
  };

  // Parses element name in any form - namespaced, member
  // or single identifier.

  pp.jsx_parseElementName = function() {
    var start = this.markPosition();
    var node = this.jsx_parseNamespacedName();
    while (this.eat(tt.dot)) {
      var newNode = this.startNodeAt(start);
      newNode.object = node;
      newNode.property = this.jsx_parseIdentifier();
      node = this.finishNode(newNode, 'JSXMemberExpression');
    }
    return node;
  };

  // Parses any type of JSX attribute value.

  pp.jsx_parseAttributeValue = function() {
    switch (this.type) {
    case tt.braceL:
      var node = this.jsx_parseExpressionContainer();
      if (node.expression.type === 'JSXEmptyExpression')
        this.raise(node.start, 'JSX attributes must only be assigned a non-empty expression');
      return node;

    case tt.jsxTagStart:
    case tt.string:
      return this.parseExprAtom();

    default:
      this.raise(this.start, 'JSX value should be either an expression or a quoted JSX text');
    }
  };

  // JSXEmptyExpression is unique type since it doesn't actually parse anything,
  // and so it should start at the end of last read token (left brace) and finish
  // at the beginning of the next one (right brace).

  pp.jsx_parseEmptyExpression = function() {
    var tmp = this.start;
    this.start = this.lastTokEnd;
    this.lastTokEnd = tmp;

    tmp = this.startLoc;
    this.startLoc = this.lastTokEndLoc;
    this.lastTokEndLoc = tmp;

    return this.finishNode(this.startNode(), 'JSXEmptyExpression');
  };

  // Parses JSX expression enclosed into curly brackets.


  pp.jsx_parseExpressionContainer = function() {
    var node = this.startNode();
    this.next();
    node.expression = this.type === tt.braceR
      ? this.jsx_parseEmptyExpression()
      : this.parseExpression();
    this.expect(tt.braceR);
    return this.finishNode(node, 'JSXExpressionContainer');
  };

  // Parses following JSX attribute name-value pair.

  pp.jsx_parseAttribute = function() {
    var node = this.startNode();
    if (this.eat(tt.braceL)) {
      this.expect(tt.ellipsis);
      node.argument = this.parseMaybeAssign();
      this.expect(tt.braceR);
      return this.finishNode(node, 'JSXSpreadAttribute');
    }
    node.name = this.jsx_parseNamespacedName();
    node.value = this.eat(tt.eq) ? this.jsx_parseAttributeValue() : null;
    return this.finishNode(node, 'JSXAttribute');
  };

  // Parses JSX opening tag starting after '<'.

  pp.jsx_parseOpeningElementAt = function(start) {
    var node = this.startNodeAt(start);
    node.attributes = [];
    node.name = this.jsx_parseElementName();
    while (this.type !== tt.slash && this.type !== tt.jsxTagEnd)
      node.attributes.push(this.jsx_parseAttribute());
    node.selfClosing = this.eat(tt.slash);
    this.expect(tt.jsxTagEnd);
    return this.finishNode(node, 'JSXOpeningElement');
  };

  // Parses JSX closing tag starting after '</'.

  pp.jsx_parseClosingElementAt = function(start) {
    var node = this.startNodeAt(start);
    node.name = this.jsx_parseElementName();
    this.expect(tt.jsxTagEnd);
    return this.finishNode(node, 'JSXClosingElement');
  };

  // Parses entire JSX element, including it's opening tag
  // (starting after '<'), attributes, contents and closing tag.

  pp.jsx_parseElementAt = function(start) {
    var node = this.startNodeAt(start);
    var children = [];
    var openingElement = this.jsx_parseOpeningElementAt(start);
    var closingElement = null;

    if (!openingElement.selfClosing) {
      contents: for (;;) {
        switch (this.type) {
        case tt.jsxTagStart:
          start = this.markPosition();
          this.next();
          if (this.eat(tt.slash)) {
            closingElement = this.jsx_parseClosingElementAt(start);
            break contents;
          }
          children.push(this.jsx_parseElementAt(start));
          break;

        case tt.jsxText:
          children.push(this.parseExprAtom());
          break;

        case tt.braceL:
          children.push(this.jsx_parseExpressionContainer());
          break;

        default:
          this.unexpected();
        }
      }
      if (getQualifiedJSXName(closingElement.name) !== getQualifiedJSXName(openingElement.name))
        this.raise(
          closingElement.start,
          'Expected corresponding JSX closing tag for <' + getQualifiedJSXName(openingElement.name) + '>');
    }

    node.openingElement = openingElement;
    node.closingElement = closingElement;
    node.children = children;
    return this.finishNode(node, 'JSXElement');
  };

  // Parses entire JSX element from current position.

  pp.jsx_parseElement = function() {
    var start = this.markPosition();
    this.next();
    return this.jsx_parseElementAt(start);
  };

  acorn.plugins.jsx = function(instance) {
    instance.extend('parseExprAtom', function(inner) {
      return function(refShortHandDefaultPos) {
        if (this.type === tt.jsxText)
          return this.parseLiteral(this.value);
        else if (this.type === tt.jsxTagStart)
          return this.jsx_parseElement();
        else
          return inner.call(this, refShortHandDefaultPos);
      };
    });

    instance.extend('readToken', function(inner) {
      return function(code) {
        var context = this.curContext();

        if (context === tc.j_expr) return this.jsx_readToken();

        if (context === tc.j_oTag || context === tc.j_cTag) {
          if (acorn.isIdentifierStart(code)) return this.jsx_readWord();

          if (code == 62) {
            ++this.pos;
            return this.finishToken(tt.jsxTagEnd);
          }

          if ((code === 34 || code === 39) && context == tc.j_oTag)
            return this.jsx_readString(code);
        }

        if (code === 60 && this.exprAllowed) {
          ++this.pos;
          return this.finishToken(tt.jsxTagStart);
        }
        return inner.call(this, code);
      };
    });

    instance.extend('updateContext', function(inner) {
      return function(prevType) {
        if (this.type == tt.braceL) {
          var curContext = this.curContext();
          if (curContext == tc.j_oTag) this.context.push(tc.b_expr);
          else if (curContext == tc.j_expr) this.context.push(tc.b_tmpl);
          else inner.call(this, prevType);
          this.exprAllowed = true;
        } else if (this.type === tt.slash && prevType === tt.jsxTagStart) {
          this.context.length -= 2; // do not consider JSX expr -> JSX open tag -> ... anymore
          this.context.push(tc.j_cTag); // reconsider as closing tag context
          this.exprAllowed = false;
        } else {
          return inner.call(this, prevType);
        }
      };
    });
  };

  return acorn;
};

},{}],173:[function(require,module,exports){
var types = require("../lib/types");
var Type = types.Type;
var def = Type.def;
var or = Type.or;
var builtin = types.builtInTypes;
var isString = builtin.string;
var isNumber = builtin.number;
var isBoolean = builtin.boolean;
var isRegExp = builtin.RegExp;
var shared = require("../lib/shared");
var defaults = shared.defaults;
var geq = shared.geq;

// Abstract supertype of all syntactic entities that are allowed to have a
// .loc field.
def("Printable")
    .field("loc", or(
        def("SourceLocation"),
        null
    ), defaults["null"], true);

def("Node")
    .bases("Printable")
    .field("type", isString)
    .field("comments", or(
        [def("Comment")],
        null
    ), defaults["null"], true);

def("SourceLocation")
    .build("start", "end", "source")
    .field("start", def("Position"))
    .field("end", def("Position"))
    .field("source", or(isString, null), defaults["null"]);

def("Position")
    .build("line", "column")
    .field("line", geq(1))
    .field("column", geq(0));

def("Program")
    .bases("Node")
    .build("body")
    .field("body", [def("Statement")]);

def("Function")
    .bases("Node")
    .field("id", or(def("Identifier"), null), defaults["null"])
    .field("params", [def("Pattern")])
    .field("body", def("BlockStatement"));

def("Statement").bases("Node");

// The empty .build() here means that an EmptyStatement can be constructed
// (i.e. it's not abstract) but that it needs no arguments.
def("EmptyStatement").bases("Statement").build();

def("BlockStatement")
    .bases("Statement")
    .build("body")
    .field("body", [def("Statement")]);

// TODO Figure out how to silently coerce Expressions to
// ExpressionStatements where a Statement was expected.
def("ExpressionStatement")
    .bases("Statement")
    .build("expression")
    .field("expression", def("Expression"));

def("IfStatement")
    .bases("Statement")
    .build("test", "consequent", "alternate")
    .field("test", def("Expression"))
    .field("consequent", def("Statement"))
    .field("alternate", or(def("Statement"), null), defaults["null"]);

def("LabeledStatement")
    .bases("Statement")
    .build("label", "body")
    .field("label", def("Identifier"))
    .field("body", def("Statement"));

def("BreakStatement")
    .bases("Statement")
    .build("label")
    .field("label", or(def("Identifier"), null), defaults["null"]);

def("ContinueStatement")
    .bases("Statement")
    .build("label")
    .field("label", or(def("Identifier"), null), defaults["null"]);

def("WithStatement")
    .bases("Statement")
    .build("object", "body")
    .field("object", def("Expression"))
    .field("body", def("Statement"));

def("SwitchStatement")
    .bases("Statement")
    .build("discriminant", "cases", "lexical")
    .field("discriminant", def("Expression"))
    .field("cases", [def("SwitchCase")])
    .field("lexical", isBoolean, defaults["false"]);

def("ReturnStatement")
    .bases("Statement")
    .build("argument")
    .field("argument", or(def("Expression"), null));

def("ThrowStatement")
    .bases("Statement")
    .build("argument")
    .field("argument", def("Expression"));

def("TryStatement")
    .bases("Statement")
    .build("block", "handler", "finalizer")
    .field("block", def("BlockStatement"))
    .field("handler", or(def("CatchClause"), null), function() {
        return this.handlers && this.handlers[0] || null;
    })
    .field("handlers", [def("CatchClause")], function() {
        return this.handler ? [this.handler] : [];
    }, true) // Indicates this field is hidden from eachField iteration.
    .field("guardedHandlers", [def("CatchClause")], defaults.emptyArray)
    .field("finalizer", or(def("BlockStatement"), null), defaults["null"]);

def("CatchClause")
    .bases("Node")
    .build("param", "guard", "body")
    .field("param", def("Pattern"))
    .field("guard", or(def("Expression"), null), defaults["null"])
    .field("body", def("BlockStatement"));

def("WhileStatement")
    .bases("Statement")
    .build("test", "body")
    .field("test", def("Expression"))
    .field("body", def("Statement"));

def("DoWhileStatement")
    .bases("Statement")
    .build("body", "test")
    .field("body", def("Statement"))
    .field("test", def("Expression"));

def("ForStatement")
    .bases("Statement")
    .build("init", "test", "update", "body")
    .field("init", or(
        def("VariableDeclaration"),
        def("Expression"),
        null))
    .field("test", or(def("Expression"), null))
    .field("update", or(def("Expression"), null))
    .field("body", def("Statement"));

def("ForInStatement")
    .bases("Statement")
    .build("left", "right", "body", "each")
    .field("left", or(
        def("VariableDeclaration"),
        def("Expression")))
    .field("right", def("Expression"))
    .field("body", def("Statement"))
    .field("each", isBoolean);

def("DebuggerStatement").bases("Statement").build();

def("Declaration").bases("Statement");

def("FunctionDeclaration")
    .bases("Function", "Declaration")
    .build("id", "params", "body")
    .field("id", def("Identifier"));

def("FunctionExpression")
    .bases("Function", "Expression")
    .build("id", "params", "body");

def("VariableDeclaration")
    .bases("Declaration")
    .build("kind", "declarations")
    .field("kind", or("var", "let", "const"))
    .field("declarations", [or(
        def("VariableDeclarator"),
        def("Identifier") // TODO Esprima deviation.
    )]);

def("VariableDeclarator")
    .bases("Node")
    .build("id", "init")
    .field("id", def("Pattern"))
    .field("init", or(def("Expression"), null));

// TODO Are all Expressions really Patterns?
def("Expression").bases("Node", "Pattern");

def("ThisExpression").bases("Expression").build();

def("ArrayExpression")
    .bases("Expression")
    .build("elements")
    .field("elements", [or(def("Expression"), null)]);

def("ObjectExpression")
    .bases("Expression")
    .build("properties")
    .field("properties", [def("Property")]);

// TODO Not in the Mozilla Parser API, but used by Esprima.
def("Property")
    .bases("Node") // Want to be able to visit Property Nodes.
    .build("kind", "key", "value")
    .field("kind", or("init", "get", "set"))
    .field("key", or(def("Literal"), def("Identifier")))
    // esprima allows Pattern
    .field("value", or(def("Expression"), def("Pattern")));

def("SequenceExpression")
    .bases("Expression")
    .build("expressions")
    .field("expressions", [def("Expression")]);

var UnaryOperator = or(
    "-", "+", "!", "~",
    "typeof", "void", "delete");

def("UnaryExpression")
    .bases("Expression")
    .build("operator", "argument", "prefix")
    .field("operator", UnaryOperator)
    .field("argument", def("Expression"))
    // TODO Esprima doesn't bother with this field, presumably because
    // it's always true for unary operators.
    .field("prefix", isBoolean, defaults["true"]);

var BinaryOperator = or(
    "==", "!=", "===", "!==",
    "<", "<=", ">", ">=",
    "<<", ">>", ">>>",
    "+", "-", "*", "/", "%",
    "&", // TODO Missing from the Parser API.
    "|", "^", "in",
    "instanceof", "..");

def("BinaryExpression")
    .bases("Expression")
    .build("operator", "left", "right")
    .field("operator", BinaryOperator)
    .field("left", def("Expression"))
    .field("right", def("Expression"));

var AssignmentOperator = or(
    "=", "+=", "-=", "*=", "/=", "%=",
    "<<=", ">>=", ">>>=",
    "|=", "^=", "&=");

def("AssignmentExpression")
    .bases("Expression")
    .build("operator", "left", "right")
    .field("operator", AssignmentOperator)
    .field("left", def("Pattern"))
    .field("right", def("Expression"));

var UpdateOperator = or("++", "--");

def("UpdateExpression")
    .bases("Expression")
    .build("operator", "argument", "prefix")
    .field("operator", UpdateOperator)
    .field("argument", def("Expression"))
    .field("prefix", isBoolean);

var LogicalOperator = or("||", "&&");

def("LogicalExpression")
    .bases("Expression")
    .build("operator", "left", "right")
    .field("operator", LogicalOperator)
    .field("left", def("Expression"))
    .field("right", def("Expression"));

def("ConditionalExpression")
    .bases("Expression")
    .build("test", "consequent", "alternate")
    .field("test", def("Expression"))
    .field("consequent", def("Expression"))
    .field("alternate", def("Expression"));

def("NewExpression")
    .bases("Expression")
    .build("callee", "arguments")
    .field("callee", def("Expression"))
    // The Mozilla Parser API gives this type as [or(def("Expression"),
    // null)], but null values don't really make sense at the call site.
    // TODO Report this nonsense.
    .field("arguments", [def("Expression")]);

def("CallExpression")
    .bases("Expression")
    .build("callee", "arguments")
    .field("callee", def("Expression"))
    // See comment for NewExpression above.
    .field("arguments", [def("Expression")]);

def("MemberExpression")
    .bases("Expression")
    .build("object", "property", "computed")
    .field("object", def("Expression"))
    .field("property", or(def("Identifier"), def("Expression")))
    .field("computed", isBoolean, defaults["false"]);

def("Pattern").bases("Node");

def("ObjectPattern")
    .bases("Pattern")
    .build("properties")
    // TODO File a bug to get PropertyPattern added to the interfaces API.
    // esprima uses Property
    .field("properties", [or(def("PropertyPattern"), def("Property"))]);

def("PropertyPattern")
    .bases("Pattern")
    .build("key", "pattern")
    .field("key", or(def("Literal"), def("Identifier")))
    .field("pattern", def("Pattern"));

def("ArrayPattern")
    .bases("Pattern")
    .build("elements")
    .field("elements", [or(def("Pattern"), null)]);

def("SwitchCase")
    .bases("Node")
    .build("test", "consequent")
    .field("test", or(def("Expression"), null))
    .field("consequent", [def("Statement")]);

def("Identifier")
    // But aren't Expressions and Patterns already Nodes? TODO Report this.
    .bases("Node", "Expression", "Pattern")
    .build("name")
    .field("name", isString);

def("Literal")
    // But aren't Expressions already Nodes? TODO Report this.
    .bases("Node", "Expression")
    .build("value")
    .field("value", or(
        isString,
        isBoolean,
        null, // isNull would also work here.
        isNumber,
        isRegExp
    ))
    .field("regex", or({
        pattern: isString,
        flags: isString
    }, null), function() {
        if (!isRegExp.check(this.value))
            return null;

        var flags = "";
        if (this.value.ignoreCase) flags += "i";
        if (this.value.multiline) flags += "m";
        if (this.value.global) flags += "g";

        return {
            pattern: this.value.source,
            flags: flags
        };
    });

// Abstract (non-buildable) comment supertype. Not a Node.
def("Comment")
    .bases("Printable")
    .field("value", isString)
    // A .leading comment comes before the node, whereas a .trailing
    // comment comes after it. These two fields should not both be true,
    // but they might both be false when the comment falls inside a node
    // and the node has no children for the comment to lead or trail,
    // e.g. { /*dangling*/ }.
    .field("leading", isBoolean, defaults["true"])
    .field("trailing", isBoolean, defaults["false"]);

// Block comment. The .type really should be BlockComment rather than
// Block, but that's what we're stuck with for now.
def("Block")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

// Single line comment. The .type really should be LineComment rather than
// Line, but that's what we're stuck with for now.
def("Line")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

},{"../lib/shared":184,"../lib/types":185}],174:[function(require,module,exports){
require("./core");
var types = require("../lib/types");
var def = types.Type.def;
var or = types.Type.or;
var builtin = types.builtInTypes;
var isString = builtin.string;
var isBoolean = builtin.boolean;

// Note that none of these types are buildable because the Mozilla Parser
// API doesn't specify any builder functions, and nobody uses E4X anymore.

def("XMLDefaultDeclaration")
    .bases("Declaration")
    .field("namespace", def("Expression"));

def("XMLAnyName").bases("Expression");

def("XMLQualifiedIdentifier")
    .bases("Expression")
    .field("left", or(def("Identifier"), def("XMLAnyName")))
    .field("right", or(def("Identifier"), def("Expression")))
    .field("computed", isBoolean);

def("XMLFunctionQualifiedIdentifier")
    .bases("Expression")
    .field("right", or(def("Identifier"), def("Expression")))
    .field("computed", isBoolean);

def("XMLAttributeSelector")
    .bases("Expression")
    .field("attribute", def("Expression"));

def("XMLFilterExpression")
    .bases("Expression")
    .field("left", def("Expression"))
    .field("right", def("Expression"));

def("XMLElement")
    .bases("XML", "Expression")
    .field("contents", [def("XML")]);

def("XMLList")
    .bases("XML", "Expression")
    .field("contents", [def("XML")]);

def("XML").bases("Node");

def("XMLEscape")
    .bases("XML")
    .field("expression", def("Expression"));

def("XMLText")
    .bases("XML")
    .field("text", isString);

def("XMLStartTag")
    .bases("XML")
    .field("contents", [def("XML")]);

def("XMLEndTag")
    .bases("XML")
    .field("contents", [def("XML")]);

def("XMLPointTag")
    .bases("XML")
    .field("contents", [def("XML")]);

def("XMLName")
    .bases("XML")
    .field("contents", or(isString, [def("XML")]));

def("XMLAttribute")
    .bases("XML")
    .field("value", isString);

def("XMLCdata")
    .bases("XML")
    .field("contents", isString);

def("XMLComment")
    .bases("XML")
    .field("contents", isString);

def("XMLProcessingInstruction")
    .bases("XML")
    .field("target", isString)
    .field("contents", or(isString, null));

},{"../lib/types":185,"./core":173}],175:[function(require,module,exports){
require("./core");
var types = require("../lib/types");
var def = types.Type.def;
var or = types.Type.or;
var builtin = types.builtInTypes;
var isBoolean = builtin.boolean;
var isObject = builtin.object;
var isString = builtin.string;
var defaults = require("../lib/shared").defaults;

def("Function")
    .field("generator", isBoolean, defaults["false"])
    .field("expression", isBoolean, defaults["false"])
    .field("defaults", [or(def("Expression"), null)], defaults.emptyArray)
    // TODO This could be represented as a SpreadElementPattern in .params.
    .field("rest", or(def("Identifier"), null), defaults["null"]);

def("FunctionDeclaration")
    .build("id", "params", "body", "generator", "expression");

def("FunctionExpression")
    .build("id", "params", "body", "generator", "expression");

// TODO The Parser API calls this ArrowExpression, but Esprima uses
// ArrowFunctionExpression.
def("ArrowFunctionExpression")
    .bases("Function", "Expression")
    .build("params", "body", "expression")
    // The forced null value here is compatible with the overridden
    // definition of the "id" field in the Function interface.
    .field("id", null, defaults["null"])
    // Arrow function bodies are allowed to be expressions.
    .field("body", or(def("BlockStatement"), def("Expression")))
    // The current spec forbids arrow generators, so I have taken the
    // liberty of enforcing that. TODO Report this.
    .field("generator", false, defaults["false"]);

def("YieldExpression")
    .bases("Expression")
    .build("argument", "delegate")
    .field("argument", or(def("Expression"), null))
    .field("delegate", isBoolean, defaults["false"]);

def("GeneratorExpression")
    .bases("Expression")
    .build("body", "blocks", "filter")
    .field("body", def("Expression"))
    .field("blocks", [def("ComprehensionBlock")])
    .field("filter", or(def("Expression"), null));

def("ComprehensionExpression")
    .bases("Expression")
    .build("body", "blocks", "filter")
    .field("body", def("Expression"))
    .field("blocks", [def("ComprehensionBlock")])
    .field("filter", or(def("Expression"), null));

def("ComprehensionBlock")
    .bases("Node")
    .build("left", "right", "each")
    .field("left", def("Pattern"))
    .field("right", def("Expression"))
    .field("each", isBoolean);

def("ModuleSpecifier")
    .bases("Literal")
    .build("value")
    .field("value", isString);

def("Property")
    // Esprima extensions not mentioned in the Mozilla Parser API:
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("method", isBoolean, defaults["false"])
    .field("shorthand", isBoolean, defaults["false"])
    .field("computed", isBoolean, defaults["false"]);

def("PropertyPattern")
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("computed", isBoolean, defaults["false"]);

def("MethodDefinition")
    .bases("Declaration")
    .build("kind", "key", "value", "static")
    .field("kind", or("init", "get", "set", ""))
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("value", def("Function"))
    .field("computed", isBoolean, defaults["false"])
    .field("static", isBoolean, defaults["false"]);

def("SpreadElement")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

def("ArrayExpression")
    .field("elements", [or(def("Expression"), def("SpreadElement"), null)]);

def("NewExpression")
    .field("arguments", [or(def("Expression"), def("SpreadElement"))]);

def("CallExpression")
    .field("arguments", [or(def("Expression"), def("SpreadElement"))]);

def("SpreadElementPattern")
    .bases("Pattern")
    .build("argument")
    .field("argument", def("Pattern"));

def("ArrayPattern")
    .field("elements", [or(
        def("Pattern"),
        null,
        // used by esprima
        def("SpreadElement")
    )]);

var ClassBodyElement = or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty")
);

def("ClassProperty")
  .bases("Declaration")
  .build("key")
  .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
  .field("computed", isBoolean, defaults["false"]);

def("ClassPropertyDefinition") // static property
    .bases("Declaration")
    .build("definition")
    // Yes, Virginia, circular definitions are permitted.
    .field("definition", ClassBodyElement);

def("ClassBody")
    .bases("Declaration")
    .build("body")
    .field("body", [ClassBodyElement]);

def("ClassDeclaration")
    .bases("Declaration")
    .build("id", "body", "superClass")
    .field("id", or(def("Identifier"), null))
    .field("body", def("ClassBody"))
    .field("superClass", or(def("Expression"), null), defaults["null"]);

def("ClassExpression")
    .bases("Expression")
    .build("id", "body", "superClass")
    .field("id", or(def("Identifier"), null), defaults["null"])
    .field("body", def("ClassBody"))
    .field("superClass", or(def("Expression"), null), defaults["null"])
    .field("implements", [def("ClassImplements")], defaults.emptyArray);

def("ClassImplements")
    .bases("Node")
    .build("id")
    .field("id", def("Identifier"))
    .field("superClass", or(def("Expression"), null), defaults["null"]);

// Specifier and NamedSpecifier are abstract non-standard types that I
// introduced for definitional convenience.
def("Specifier").bases("Node");
def("NamedSpecifier")
    .bases("Specifier")
    // Note: this abstract type is intentionally not buildable.
    .field("id", def("Identifier"))
    .field("name", or(def("Identifier"), null), defaults["null"]);

// Like NamedSpecifier, except type:"ExportSpecifier" and buildable.
// export {<id [as name]>} [from ...];
def("ExportSpecifier")
    .bases("NamedSpecifier")
    .build("id", "name");

// export <*> from ...;
def("ExportBatchSpecifier")
    .bases("Specifier")
    .build();

// Like NamedSpecifier, except type:"ImportSpecifier" and buildable.
// import {<id [as name]>} from ...;
def("ImportSpecifier")
    .bases("NamedSpecifier")
    .build("id", "name");

// import <* as id> from ...;
def("ImportNamespaceSpecifier")
    .bases("Specifier")
    .build("id")
    .field("id", def("Identifier"));

// import <id> from ...;
def("ImportDefaultSpecifier")
    .bases("Specifier")
    .build("id")
    .field("id", def("Identifier"));

def("ExportDeclaration")
    .bases("Declaration")
    .build("default", "declaration", "specifiers", "source")
    .field("default", isBoolean)
    .field("declaration", or(
        def("Declaration"),
        def("Expression"), // Implies default.
        null
    ))
    .field("specifiers", [or(
        def("ExportSpecifier"),
        def("ExportBatchSpecifier")
    )], defaults.emptyArray)
    .field("source", or(
        def("Literal"),
        def("ModuleSpecifier"),
        null
    ), defaults["null"]);

def("ImportDeclaration")
    .bases("Declaration")
    .build("specifiers", "source")
    .field("specifiers", [or(
        def("ImportSpecifier"),
        def("ImportNamespaceSpecifier"),
        def("ImportDefaultSpecifier")
    )], defaults.emptyArray)
    .field("source", or(
        def("Literal"),
        def("ModuleSpecifier")
    ));

def("TaggedTemplateExpression")
    .bases("Expression")
    .field("tag", def("Expression"))
    .field("quasi", def("TemplateLiteral"));

def("TemplateLiteral")
    .bases("Expression")
    .build("quasis", "expressions")
    .field("quasis", [def("TemplateElement")])
    .field("expressions", [def("Expression")]);

def("TemplateElement")
    .bases("Node")
    .build("value", "tail")
    .field("value", {"cooked": isString, "raw": isString})
    .field("tail", isBoolean);

},{"../lib/shared":184,"../lib/types":185,"./core":173}],176:[function(require,module,exports){
require("./core");
var types = require("../lib/types");
var def = types.Type.def;
var or = types.Type.or;
var builtin = types.builtInTypes;
var isBoolean = builtin.boolean;
var defaults = require("../lib/shared").defaults;

def("Function")
    .field("async", isBoolean, defaults["false"]);

def("SpreadProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

def("ObjectExpression")
    .field("properties", [or(def("Property"), def("SpreadProperty"))]);

def("SpreadPropertyPattern")
    .bases("Pattern")
    .build("argument")
    .field("argument", def("Pattern"));

def("ObjectPattern")
    .field("properties", [or(
        def("PropertyPattern"),
        def("SpreadPropertyPattern"),
        // used by esprima
        def("Property"),
        def("SpreadProperty")
    )]);

def("AwaitExpression")
    .bases("Expression")
    .build("argument", "all")
    .field("argument", or(def("Expression"), null))
    .field("all", isBoolean, defaults["false"]);

},{"../lib/shared":184,"../lib/types":185,"./core":173}],177:[function(require,module,exports){
require("./core");
var types = require("../lib/types");
var def = types.Type.def;
var or = types.Type.or;
var builtin = types.builtInTypes;
var isString = builtin.string;
var isBoolean = builtin.boolean;
var defaults = require("../lib/shared").defaults;

def("JSXAttribute")
    .bases("Node")
    .build("name", "value")
    .field("name", or(def("JSXIdentifier"), def("JSXNamespacedName")))
    .field("value", or(
        def("Literal"), // attr="value"
        def("JSXExpressionContainer"), // attr={value}
        null // attr= or just attr
    ), defaults["null"]);

def("JSXIdentifier")
    .bases("Identifier")
    .build("name")
    .field("name", isString);

def("JSXNamespacedName")
    .bases("Node")
    .build("namespace", "name")
    .field("namespace", def("JSXIdentifier"))
    .field("name", def("JSXIdentifier"));

def("JSXMemberExpression")
    .bases("MemberExpression")
    .build("object", "property")
    .field("object", or(def("JSXIdentifier"), def("JSXMemberExpression")))
    .field("property", def("JSXIdentifier"))
    .field("computed", isBoolean, defaults.false);

var JSXElementName = or(
    def("JSXIdentifier"),
    def("JSXNamespacedName"),
    def("JSXMemberExpression")
);

def("JSXSpreadAttribute")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

var JSXAttributes = [or(
    def("JSXAttribute"),
    def("JSXSpreadAttribute")
)];

def("JSXExpressionContainer")
    .bases("Expression")
    .build("expression")
    .field("expression", def("Expression"));

def("JSXElement")
    .bases("Expression")
    .build("openingElement", "closingElement", "children")
    .field("openingElement", def("JSXOpeningElement"))
    .field("closingElement", or(def("JSXClosingElement"), null), defaults["null"])
    .field("children", [or(
        def("JSXElement"),
        def("JSXExpressionContainer"),
        def("JSXText"),
        def("Literal") // TODO Esprima should return JSXText instead.
    )], defaults.emptyArray)
    .field("name", JSXElementName, function() {
        // Little-known fact: the `this` object inside a default function
        // is none other than the partially-built object itself, and any
        // fields initialized directly from builder function arguments
        // (like openingElement, closingElement, and children) are
        // guaranteed to be available.
        return this.openingElement.name;
    })
    .field("selfClosing", isBoolean, function() {
        return this.openingElement.selfClosing;
    })
    .field("attributes", JSXAttributes, function() {
        return this.openingElement.attributes;
    });

def("JSXOpeningElement")
    .bases("Node") // TODO Does this make sense? Can't really be an JSXElement.
    .build("name", "attributes", "selfClosing")
    .field("name", JSXElementName)
    .field("attributes", JSXAttributes, defaults.emptyArray)
    .field("selfClosing", isBoolean, defaults["false"]);

def("JSXClosingElement")
    .bases("Node") // TODO Same concern.
    .build("name")
    .field("name", JSXElementName);

def("JSXText")
    .bases("Literal")
    .build("value")
    .field("value", isString);

def("JSXEmptyExpression").bases("Expression").build();

// Type Annotations
def("Type")
  .bases("Node");

def("AnyTypeAnnotation")
  .bases("Type");

def("VoidTypeAnnotation")
  .bases("Type");

def("NumberTypeAnnotation")
  .bases("Type");

def("StringTypeAnnotation")
  .bases("Type");

def("StringLiteralTypeAnnotation")
  .bases("Type")
  .build("value", "raw")
  .field("value", isString)
  .field("raw", isString);

def("BooleanTypeAnnotation")
  .bases("Type");

def("TypeAnnotation")
  .bases("Node")
  .build("typeAnnotation")
  .field("typeAnnotation", def("Type"));

def("NullableTypeAnnotation")
  .bases("Type")
  .build("typeAnnotation")
  .field("typeAnnotation", def("Type"));

def("FunctionTypeAnnotation")
  .bases("Type")
  .build("params", "returnType", "rest", "typeParameters")
  .field("params", [def("FunctionTypeParam")])
  .field("returnType", def("Type"))
  .field("rest", or(def("FunctionTypeParam"), null))
  .field("typeParameters", or(def("TypeParameterDeclaration"), null));

def("FunctionTypeParam")
  .bases("Node")
  .build("name", "typeAnnotation", "optional")
  .field("name", def("Identifier"))
  .field("typeAnnotation", def("Type"))
  .field("optional", isBoolean);

def("ArrayTypeAnnotation")
  .bases("Type")
  .build("elementType")
  .field("elementType", def("Type"));

def("ObjectTypeAnnotation")
  .bases("Type")
  .build("properties")
  .field("properties", [def("ObjectTypeProperty")])
  .field("indexers", [def("ObjectTypeIndexer")], defaults.emptyArray)
  .field("callProperties", [def("ObjectTypeCallProperty")], defaults.emptyArray);

def("ObjectTypeProperty")
  .bases("Node")
  .build("key", "value", "optional")
  .field("key", or(def("Literal"), def("Identifier")))
  .field("value", def("Type"))
  .field("optional", isBoolean);

def("ObjectTypeIndexer")
  .bases("Node")
  .build("id", "key", "value")
  .field("id", def("Identifier"))
  .field("key", def("Type"))
  .field("value", def("Type"));

def("ObjectTypeCallProperty")
  .bases("Node")
  .build("value")
  .field("value", def("FunctionTypeAnnotation"))
  .field("static", isBoolean, false);

def("QualifiedTypeIdentifier")
  .bases("Node")
  .build("qualification", "id")
  .field("qualification", or(def("Identifier"), def("QualifiedTypeIdentifier")))
  .field("id", def("Identifier"));

def("GenericTypeAnnotation")
  .bases("Type")
  .build("id", "typeParameters")
  .field("id", or(def("Identifier"), def("QualifiedTypeIdentifier")))
  .field("typeParameters", or(def("TypeParameterInstantiation"), null));

def("MemberTypeAnnotation")
  .bases("Type")
  .build("object", "property")
  .field("object", def("Identifier"))
  .field("property", or(def("MemberTypeAnnotation"), def("GenericTypeAnnotation")));

def("UnionTypeAnnotation")
  .bases("Type")
  .build("types")
  .field("types", [def("Type")]);

def("IntersectionTypeAnnotation")
  .bases("Type")
  .build("types")
  .field("types", [def("Type")]);

def("TypeofTypeAnnotation")
  .bases("Type")
  .build("argument")
  .field("argument", def("Type"));

def("Identifier")
  .field("typeAnnotation", or(def("TypeAnnotation"), null), defaults["null"]);

def("TypeParameterDeclaration")
  .bases("Node")
  .build("params")
  .field("params", [def("Identifier")]);

def("TypeParameterInstantiation")
  .bases("Node")
  .build("params")
  .field("params", [def("Type")]);

def("Function")
  .field("returnType", or(def("TypeAnnotation"), null), defaults["null"])
  .field("typeParameters", or(def("TypeParameterDeclaration"), null), defaults["null"]);

def("ClassProperty")
  .build("key", "typeAnnotation")
  .field("typeAnnotation", def("TypeAnnotation"))
  .field("static", isBoolean, false);

def("ClassImplements")
  .field("typeParameters", or(def("TypeParameterInstantiation"), null), defaults["null"]);

def("InterfaceDeclaration")
  .bases("Statement")
  .build("id", "body", "extends")
  .field("id", def("Identifier"))
  .field("typeParameters", or(def("TypeParameterDeclaration"), null), defaults["null"])
  .field("body", def("ObjectTypeAnnotation"))
  .field("extends", [def("InterfaceExtends")]);

def("InterfaceExtends")
  .bases("Node")
  .build("id")
  .field("id", def("Identifier"))
  .field("typeParameters", or(def("TypeParameterInstantiation"), null));

def("TypeAlias")
  .bases("Statement")
  .build("id", "typeParameters", "right")
  .field("id", def("Identifier"))
  .field("typeParameters", or(def("TypeParameterDeclaration"), null))
  .field("right", def("Type"));

def("TypeCastExpression")
  .bases("Expression")
  .build("expression", "typeAnnotation")
  .field("expression", def("Expression"))
  .field("typeAnnotation", def("TypeAnnotation"));

def("TupleTypeAnnotation")
  .bases("Type")
  .build("types")
  .field("types", [def("Type")]);

def("DeclareVariable")
  .bases("Statement")
  .build("id")
  .field("id", def("Identifier"));

def("DeclareFunction")
  .bases("Statement")
  .build("id")
  .field("id", def("Identifier"));

def("DeclareClass")
  .bases("InterfaceDeclaration")
  .build("id");

def("DeclareModule")
  .bases("Statement")
  .build("id", "body")
  .field("id", or(def("Identifier"), def("Literal")))
  .field("body", def("BlockStatement"));

},{"../lib/shared":184,"../lib/types":185,"./core":173}],178:[function(require,module,exports){
require("./core");
var types = require("../lib/types");
var def = types.Type.def;
var or = types.Type.or;
var geq = require("../lib/shared").geq;

def("Function")
    // SpiderMonkey allows expression closures: function(x) x+1
    .field("body", or(def("BlockStatement"), def("Expression")));

def("ForOfStatement")
    .bases("Statement")
    .build("left", "right", "body")
    .field("left", or(
        def("VariableDeclaration"),
        def("Expression")))
    .field("right", def("Expression"))
    .field("body", def("Statement"));

def("LetStatement")
    .bases("Statement")
    .build("head", "body")
    // TODO Deviating from the spec by reusing VariableDeclarator here.
    .field("head", [def("VariableDeclarator")])
    .field("body", def("Statement"));

def("LetExpression")
    .bases("Expression")
    .build("head", "body")
    // TODO Deviating from the spec by reusing VariableDeclarator here.
    .field("head", [def("VariableDeclarator")])
    .field("body", def("Expression"));

def("GraphExpression")
    .bases("Expression")
    .build("index", "expression")
    .field("index", geq(0))
    .field("expression", def("Literal"));

def("GraphIndexExpression")
    .bases("Expression")
    .build("index")
    .field("index", geq(0));

},{"../lib/shared":184,"../lib/types":185,"./core":173}],179:[function(require,module,exports){
var assert = require("assert");
var types = require("../main");
var getFieldNames = types.getFieldNames;
var getFieldValue = types.getFieldValue;
var isArray = types.builtInTypes.array;
var isObject = types.builtInTypes.object;
var isDate = types.builtInTypes.Date;
var isRegExp = types.builtInTypes.RegExp;
var hasOwn = Object.prototype.hasOwnProperty;

function astNodesAreEquivalent(a, b, problemPath) {
    if (isArray.check(problemPath)) {
        problemPath.length = 0;
    } else {
        problemPath = null;
    }

    return areEquivalent(a, b, problemPath);
}

astNodesAreEquivalent.assert = function(a, b) {
    var problemPath = [];
    if (!astNodesAreEquivalent(a, b, problemPath)) {
        if (problemPath.length === 0) {
            assert.strictEqual(a, b);
        } else {
            assert.ok(
                false,
                "Nodes differ in the following path: " +
                    problemPath.map(subscriptForProperty).join("")
            );
        }
    }
};

function subscriptForProperty(property) {
    if (/[_$a-z][_$a-z0-9]*/i.test(property)) {
        return "." + property;
    }
    return "[" + JSON.stringify(property) + "]";
}

function areEquivalent(a, b, problemPath) {
    if (a === b) {
        return true;
    }

    if (isArray.check(a)) {
        return arraysAreEquivalent(a, b, problemPath);
    }

    if (isObject.check(a)) {
        return objectsAreEquivalent(a, b, problemPath);
    }

    if (isDate.check(a)) {
        return isDate.check(b) && (+a === +b);
    }

    if (isRegExp.check(a)) {
        return isRegExp.check(b) && (
            a.source === b.source &&
            a.global === b.global &&
            a.multiline === b.multiline &&
            a.ignoreCase === b.ignoreCase
        );
    }

    return a == b;
}

function arraysAreEquivalent(a, b, problemPath) {
    isArray.assert(a);
    var aLength = a.length;

    if (!isArray.check(b) || b.length !== aLength) {
        if (problemPath) {
            problemPath.push("length");
        }
        return false;
    }

    for (var i = 0; i < aLength; ++i) {
        if (problemPath) {
            problemPath.push(i);
        }

        if (i in a !== i in b) {
            return false;
        }

        if (!areEquivalent(a[i], b[i], problemPath)) {
            return false;
        }

        if (problemPath) {
            assert.strictEqual(problemPath.pop(), i);
        }
    }

    return true;
}

function objectsAreEquivalent(a, b, problemPath) {
    isObject.assert(a);
    if (!isObject.check(b)) {
        return false;
    }

    // Fast path for a common property of AST nodes.
    if (a.type !== b.type) {
        if (problemPath) {
            problemPath.push("type");
        }
        return false;
    }

    var aNames = getFieldNames(a);
    var aNameCount = aNames.length;

    var bNames = getFieldNames(b);
    var bNameCount = bNames.length;

    if (aNameCount === bNameCount) {
        for (var i = 0; i < aNameCount; ++i) {
            var name = aNames[i];
            var aChild = getFieldValue(a, name);
            var bChild = getFieldValue(b, name);

            if (problemPath) {
                problemPath.push(name);
            }

            if (!areEquivalent(aChild, bChild, problemPath)) {
                return false;
            }

            if (problemPath) {
                assert.strictEqual(problemPath.pop(), name);
            }
        }

        return true;
    }

    if (!problemPath) {
        return false;
    }

    // Since aNameCount !== bNameCount, we need to find some name that's
    // missing in aNames but present in bNames, or vice-versa.

    var seenNames = Object.create(null);

    for (i = 0; i < aNameCount; ++i) {
        seenNames[aNames[i]] = true;
    }

    for (i = 0; i < bNameCount; ++i) {
        name = bNames[i];

        if (!hasOwn.call(seenNames, name)) {
            problemPath.push(name);
            return false;
        }

        delete seenNames[name];
    }

    for (name in seenNames) {
        problemPath.push(name);
        break;
    }

    return false;
}

module.exports = astNodesAreEquivalent;

},{"../main":186,"assert":188}],180:[function(require,module,exports){
var assert = require("assert");
var types = require("./types");
var n = types.namedTypes;
var b = types.builders;
var isNumber = types.builtInTypes.number;
var isArray = types.builtInTypes.array;
var Path = require("./path");
var Scope = require("./scope");

function NodePath(value, parentPath, name) {
    assert.ok(this instanceof NodePath);
    Path.call(this, value, parentPath, name);
}

require("util").inherits(NodePath, Path);
var NPp = NodePath.prototype;

Object.defineProperties(NPp, {
    node: {
        get: function() {
            Object.defineProperty(this, "node", {
                configurable: true, // Enable deletion.
                value: this._computeNode()
            });

            return this.node;
        }
    },

    parent: {
        get: function() {
            Object.defineProperty(this, "parent", {
                configurable: true, // Enable deletion.
                value: this._computeParent()
            });

            return this.parent;
        }
    },

    scope: {
        get: function() {
            Object.defineProperty(this, "scope", {
                configurable: true, // Enable deletion.
                value: this._computeScope()
            });

            return this.scope;
        }
    }
});

NPp.replace = function() {
    delete this.node;
    delete this.parent;
    delete this.scope;
    return Path.prototype.replace.apply(this, arguments);
};

NPp.prune = function() {
    var remainingNodePath = this.parent;

    this.replace();

    return cleanUpNodesAfterPrune(remainingNodePath);
};

// The value of the first ancestor Path whose value is a Node.
NPp._computeNode = function() {
    var value = this.value;
    if (n.Node.check(value)) {
        return value;
    }

    var pp = this.parentPath;
    return pp && pp.node || null;
};

// The first ancestor Path whose value is a Node distinct from this.node.
NPp._computeParent = function() {
    var value = this.value;
    var pp = this.parentPath;

    if (!n.Node.check(value)) {
        while (pp && !n.Node.check(pp.value)) {
            pp = pp.parentPath;
        }

        if (pp) {
            pp = pp.parentPath;
        }
    }

    while (pp && !n.Node.check(pp.value)) {
        pp = pp.parentPath;
    }

    return pp || null;
};

// The closest enclosing scope that governs this node.
NPp._computeScope = function() {
    var value = this.value;
    var pp = this.parentPath;
    var scope = pp && pp.scope;

    if (n.Node.check(value) &&
        Scope.isEstablishedBy(value)) {
        scope = new Scope(this, scope);
    }

    return scope || null;
};

NPp.getValueProperty = function(name) {
    return types.getFieldValue(this.value, name);
};

/**
 * Determine whether this.node needs to be wrapped in parentheses in order
 * for a parser to reproduce the same local AST structure.
 *
 * For instance, in the expression `(1 + 2) * 3`, the BinaryExpression
 * whose operator is "+" needs parentheses, because `1 + 2 * 3` would
 * parse differently.
 *
 * If assumeExpressionContext === true, we don't worry about edge cases
 * like an anonymous FunctionExpression appearing lexically first in its
 * enclosing statement and thus needing parentheses to avoid being parsed
 * as a FunctionDeclaration with a missing name.
 */
NPp.needsParens = function(assumeExpressionContext) {
    var pp = this.parentPath;
    if (!pp) {
        return false;
    }

    var node = this.value;

    // Only expressions need parentheses.
    if (!n.Expression.check(node)) {
        return false;
    }

    // Identifiers never need parentheses.
    if (node.type === "Identifier") {
        return false;
    }

    while (!n.Node.check(pp.value)) {
        pp = pp.parentPath;
        if (!pp) {
            return false;
        }
    }

    var parent = pp.value;

    switch (node.type) {
    case "UnaryExpression":
    case "SpreadElement":
    case "SpreadProperty":
        return parent.type === "MemberExpression"
            && this.name === "object"
            && parent.object === node;

    case "BinaryExpression":
    case "LogicalExpression":
        switch (parent.type) {
        case "CallExpression":
            return this.name === "callee"
                && parent.callee === node;

        case "UnaryExpression":
        case "SpreadElement":
        case "SpreadProperty":
            return true;

        case "MemberExpression":
            return this.name === "object"
                && parent.object === node;

        case "BinaryExpression":
        case "LogicalExpression":
            var po = parent.operator;
            var pp = PRECEDENCE[po];
            var no = node.operator;
            var np = PRECEDENCE[no];

            if (pp > np) {
                return true;
            }

            if (pp === np && this.name === "right") {
                assert.strictEqual(parent.right, node);
                return true;
            }

        default:
            return false;
        }

    case "SequenceExpression":
        switch (parent.type) {
        case "ForStatement":
            // Although parentheses wouldn't hurt around sequence
            // expressions in the head of for loops, traditional style
            // dictates that e.g. i++, j++ should not be wrapped with
            // parentheses.
            return false;

        case "ExpressionStatement":
            return this.name !== "expression";

        default:
            // Otherwise err on the side of overparenthesization, adding
            // explicit exceptions above if this proves overzealous.
            return true;
        }

    case "YieldExpression":
        switch (parent.type) {
        case "BinaryExpression":
        case "LogicalExpression":
        case "UnaryExpression":
        case "SpreadElement":
        case "SpreadProperty":
        case "CallExpression":
        case "MemberExpression":
        case "NewExpression":
        case "ConditionalExpression":
        case "YieldExpression":
            return true;

        default:
            return false;
        }

    case "Literal":
        return parent.type === "MemberExpression"
            && isNumber.check(node.value)
            && this.name === "object"
            && parent.object === node;

    case "AssignmentExpression":
    case "ConditionalExpression":
        switch (parent.type) {
        case "UnaryExpression":
        case "SpreadElement":
        case "SpreadProperty":
        case "BinaryExpression":
        case "LogicalExpression":
            return true;

        case "CallExpression":
            return this.name === "callee"
                && parent.callee === node;

        case "ConditionalExpression":
            return this.name === "test"
                && parent.test === node;

        case "MemberExpression":
            return this.name === "object"
                && parent.object === node;

        default:
            return false;
        }

    default:
        if (parent.type === "NewExpression" &&
            this.name === "callee" &&
            parent.callee === node) {
            return containsCallExpression(node);
        }
    }

    if (assumeExpressionContext !== true &&
        !this.canBeFirstInStatement() &&
        this.firstInStatement())
        return true;

    return false;
};

function isBinary(node) {
    return n.BinaryExpression.check(node)
        || n.LogicalExpression.check(node);
}

function isUnaryLike(node) {
    return n.UnaryExpression.check(node)
        // I considered making SpreadElement and SpreadProperty subtypes
        // of UnaryExpression, but they're not really Expression nodes.
        || (n.SpreadElement && n.SpreadElement.check(node))
        || (n.SpreadProperty && n.SpreadProperty.check(node));
}

var PRECEDENCE = {};
[["||"],
 ["&&"],
 ["|"],
 ["^"],
 ["&"],
 ["==", "===", "!=", "!=="],
 ["<", ">", "<=", ">=", "in", "instanceof"],
 [">>", "<<", ">>>"],
 ["+", "-"],
 ["*", "/", "%"]
].forEach(function(tier, i) {
    tier.forEach(function(op) {
        PRECEDENCE[op] = i;
    });
});

function containsCallExpression(node) {
    if (n.CallExpression.check(node)) {
        return true;
    }

    if (isArray.check(node)) {
        return node.some(containsCallExpression);
    }

    if (n.Node.check(node)) {
        return types.someField(node, function(name, child) {
            return containsCallExpression(child);
        });
    }

    return false;
}

NPp.canBeFirstInStatement = function() {
    var node = this.node;
    return !n.FunctionExpression.check(node)
        && !n.ObjectExpression.check(node);
};

NPp.firstInStatement = function() {
    return firstInStatement(this);
};

function firstInStatement(path) {
    for (var node, parent; path.parent; path = path.parent) {
        node = path.node;
        parent = path.parent.node;

        if (n.BlockStatement.check(parent) &&
            path.parent.name === "body" &&
            path.name === 0) {
            assert.strictEqual(parent.body[0], node);
            return true;
        }

        if (n.ExpressionStatement.check(parent) &&
            path.name === "expression") {
            assert.strictEqual(parent.expression, node);
            return true;
        }

        if (n.SequenceExpression.check(parent) &&
            path.parent.name === "expressions" &&
            path.name === 0) {
            assert.strictEqual(parent.expressions[0], node);
            continue;
        }

        if (n.CallExpression.check(parent) &&
            path.name === "callee") {
            assert.strictEqual(parent.callee, node);
            continue;
        }

        if (n.MemberExpression.check(parent) &&
            path.name === "object") {
            assert.strictEqual(parent.object, node);
            continue;
        }

        if (n.ConditionalExpression.check(parent) &&
            path.name === "test") {
            assert.strictEqual(parent.test, node);
            continue;
        }

        if (isBinary(parent) &&
            path.name === "left") {
            assert.strictEqual(parent.left, node);
            continue;
        }

        if (n.UnaryExpression.check(parent) &&
            !parent.prefix &&
            path.name === "argument") {
            assert.strictEqual(parent.argument, node);
            continue;
        }

        return false;
    }

    return true;
}

/**
 * Pruning certain nodes will result in empty or incomplete nodes, here we clean those nodes up.
 */
function cleanUpNodesAfterPrune(remainingNodePath) {
    if (n.VariableDeclaration.check(remainingNodePath.node)) {
        var declarations = remainingNodePath.get('declarations').value;
        if (!declarations || declarations.length === 0) {
            return remainingNodePath.prune();
        }
    } else if (n.ExpressionStatement.check(remainingNodePath.node)) {
        if (!remainingNodePath.get('expression').value) {
            return remainingNodePath.prune();
        }
    } else if (n.IfStatement.check(remainingNodePath.node)) {
        cleanUpIfStatementAfterPrune(remainingNodePath);
    }

    return remainingNodePath;
}

function cleanUpIfStatementAfterPrune(ifStatement) {
    var testExpression = ifStatement.get('test').value;
    var alternate = ifStatement.get('alternate').value;
    var consequent = ifStatement.get('consequent').value;

    if (!consequent && !alternate) {
        var testExpressionStatement = b.expressionStatement(testExpression);

        ifStatement.replace(testExpressionStatement);
    } else if (!consequent && alternate) {
        var negatedTestExpression = b.unaryExpression('!', testExpression, true);

        if (n.UnaryExpression.check(testExpression) && testExpression.operator === '!') {
            negatedTestExpression = testExpression.argument;
        }

        ifStatement.get("test").replace(negatedTestExpression);
        ifStatement.get("consequent").replace(alternate);
        ifStatement.get("alternate").replace();
    }
}

module.exports = NodePath;

},{"./path":182,"./scope":183,"./types":185,"assert":188,"util":214}],181:[function(require,module,exports){
var assert = require("assert");
var types = require("./types");
var NodePath = require("./node-path");
var Printable = types.namedTypes.Printable;
var isArray = types.builtInTypes.array;
var isObject = types.builtInTypes.object;
var isFunction = types.builtInTypes.function;
var hasOwn = Object.prototype.hasOwnProperty;
var undefined;

function PathVisitor() {
    assert.ok(this instanceof PathVisitor);

    // Permanent state.
    this._reusableContextStack = [];

    this._methodNameTable = computeMethodNameTable(this);
    this._shouldVisitComments =
        hasOwn.call(this._methodNameTable, "Block") ||
        hasOwn.call(this._methodNameTable, "Line");

    this.Context = makeContextConstructor(this);

    // State reset every time PathVisitor.prototype.visit is called.
    this._visiting = false;
    this._changeReported = false;
}

function computeMethodNameTable(visitor) {
    var typeNames = Object.create(null);

    for (var methodName in visitor) {
        if (/^visit[A-Z]/.test(methodName)) {
            typeNames[methodName.slice("visit".length)] = true;
        }
    }

    var supertypeTable = types.computeSupertypeLookupTable(typeNames);
    var methodNameTable = Object.create(null);

    var typeNames = Object.keys(supertypeTable);
    var typeNameCount = typeNames.length;
    for (var i = 0; i < typeNameCount; ++i) {
        var typeName = typeNames[i];
        methodName = "visit" + supertypeTable[typeName];
        if (isFunction.check(visitor[methodName])) {
            methodNameTable[typeName] = methodName;
        }
    }

    return methodNameTable;
}

PathVisitor.fromMethodsObject = function fromMethodsObject(methods) {
    if (methods instanceof PathVisitor) {
        return methods;
    }

    if (!isObject.check(methods)) {
        // An empty visitor?
        return new PathVisitor;
    }

    function Visitor() {
        assert.ok(this instanceof Visitor);
        PathVisitor.call(this);
    }

    var Vp = Visitor.prototype = Object.create(PVp);
    Vp.constructor = Visitor;

    extend(Vp, methods);
    extend(Visitor, PathVisitor);

    isFunction.assert(Visitor.fromMethodsObject);
    isFunction.assert(Visitor.visit);

    return new Visitor;
};

function extend(target, source) {
    for (var property in source) {
        if (hasOwn.call(source, property)) {
            target[property] = source[property];
        }
    }

    return target;
}

PathVisitor.visit = function visit(node, methods) {
    return PathVisitor.fromMethodsObject(methods).visit(node);
};

var PVp = PathVisitor.prototype;

var recursiveVisitWarning = [
    "Recursively calling visitor.visit(path) resets visitor state.",
    "Try this.visit(path) or this.traverse(path) instead."
].join(" ");

PVp.visit = function() {
    assert.ok(!this._visiting, recursiveVisitWarning);

    // Private state that needs to be reset before every traversal.
    this._visiting = true;
    this._changeReported = false;
    this._abortRequested = false;

    var argc = arguments.length;
    var args = new Array(argc)
    for (var i = 0; i < argc; ++i) {
        args[i] = arguments[i];
    }

    if (!(args[0] instanceof NodePath)) {
        args[0] = new NodePath({ root: args[0] }).get("root");
    }

    // Called with the same arguments as .visit.
    this.reset.apply(this, args);

    try {
        var root = this.visitWithoutReset(args[0]);
        var didNotThrow = true;
    } finally {
        this._visiting = false;

        if (!didNotThrow && this._abortRequested) {
            // If this.visitWithoutReset threw an exception and
            // this._abortRequested was set to true, return the root of
            // the AST instead of letting the exception propagate, so that
            // client code does not have to provide a try-catch block to
            // intercept the AbortRequest exception.  Other kinds of
            // exceptions will propagate without being intercepted and
            // rethrown by a catch block, so their stacks will accurately
            // reflect the original throwing context.
            return args[0].value;
        }
    }

    return root;
};

PVp.AbortRequest = function AbortRequest() {};
PVp.abort = function() {
    var visitor = this;
    visitor._abortRequested = true;
    var request = new visitor.AbortRequest();

    // If you decide to catch this exception and stop it from propagating,
    // make sure to call its cancel method to avoid silencing other
    // exceptions that might be thrown later in the traversal.
    request.cancel = function() {
        visitor._abortRequested = false;
    };

    throw request;
};

PVp.reset = function(path/*, additional arguments */) {
    // Empty stub; may be reassigned or overridden by subclasses.
};

PVp.visitWithoutReset = function(path) {
    if (this instanceof this.Context) {
        // Since this.Context.prototype === this, there's a chance we
        // might accidentally call context.visitWithoutReset. If that
        // happens, re-invoke the method against context.visitor.
        return this.visitor.visitWithoutReset(path);
    }

    assert.ok(path instanceof NodePath);
    var value = path.value;

    var methodName = Printable.check(value) && this._methodNameTable[value.type];
    if (methodName) {
        var context = this.acquireContext(path);
        try {
            return context.invokeVisitorMethod(methodName);
        } finally {
            this.releaseContext(context);
        }

    } else {
        // If there was no visitor method to call, visit the children of
        // this node generically.
        return visitChildren(path, this);
    }
};

function visitChildren(path, visitor) {
    assert.ok(path instanceof NodePath);
    assert.ok(visitor instanceof PathVisitor);

    var value = path.value;

    if (isArray.check(value)) {
        path.each(visitor.visitWithoutReset, visitor);
    } else if (!isObject.check(value)) {
        // No children to visit.
    } else {
        var childNames = types.getFieldNames(value);

        // The .comments field of the Node type is hidden, so we only
        // visit it if the visitor defines visitBlock or visitLine, and
        // value.comments is defined.
        if (visitor._shouldVisitComments &&
            value.comments &&
            childNames.indexOf("comments") < 0) {
            childNames.push("comments");
        }

        var childCount = childNames.length;
        var childPaths = [];

        for (var i = 0; i < childCount; ++i) {
            var childName = childNames[i];
            if (!hasOwn.call(value, childName)) {
                value[childName] = types.getFieldValue(value, childName);
            }
            childPaths.push(path.get(childName));
        }

        for (var i = 0; i < childCount; ++i) {
            visitor.visitWithoutReset(childPaths[i]);
        }
    }

    return path.value;
}

PVp.acquireContext = function(path) {
    if (this._reusableContextStack.length === 0) {
        return new this.Context(path);
    }
    return this._reusableContextStack.pop().reset(path);
};

PVp.releaseContext = function(context) {
    assert.ok(context instanceof this.Context);
    this._reusableContextStack.push(context);
    context.currentPath = null;
};

PVp.reportChanged = function() {
    this._changeReported = true;
};

PVp.wasChangeReported = function() {
    return this._changeReported;
};

function makeContextConstructor(visitor) {
    function Context(path) {
        assert.ok(this instanceof Context);
        assert.ok(this instanceof PathVisitor);
        assert.ok(path instanceof NodePath);

        Object.defineProperty(this, "visitor", {
            value: visitor,
            writable: false,
            enumerable: true,
            configurable: false
        });

        this.currentPath = path;
        this.needToCallTraverse = true;

        Object.seal(this);
    }

    assert.ok(visitor instanceof PathVisitor);

    // Note that the visitor object is the prototype of Context.prototype,
    // so all visitor methods are inherited by context objects.
    var Cp = Context.prototype = Object.create(visitor);

    Cp.constructor = Context;
    extend(Cp, sharedContextProtoMethods);

    return Context;
}

// Every PathVisitor has a different this.Context constructor and
// this.Context.prototype object, but those prototypes can all use the
// same reset, invokeVisitorMethod, and traverse function objects.
var sharedContextProtoMethods = Object.create(null);

sharedContextProtoMethods.reset =
function reset(path) {
    assert.ok(this instanceof this.Context);
    assert.ok(path instanceof NodePath);

    this.currentPath = path;
    this.needToCallTraverse = true;

    return this;
};

sharedContextProtoMethods.invokeVisitorMethod =
function invokeVisitorMethod(methodName) {
    assert.ok(this instanceof this.Context);
    assert.ok(this.currentPath instanceof NodePath);

    var result = this.visitor[methodName].call(this, this.currentPath);

    if (result === false) {
        // Visitor methods return false to indicate that they have handled
        // their own traversal needs, and we should not complain if
        // this.needToCallTraverse is still true.
        this.needToCallTraverse = false;

    } else if (result !== undefined) {
        // Any other non-undefined value returned from the visitor method
        // is interpreted as a replacement value.
        this.currentPath = this.currentPath.replace(result)[0];

        if (this.needToCallTraverse) {
            // If this.traverse still hasn't been called, visit the
            // children of the replacement node.
            this.traverse(this.currentPath);
        }
    }

    assert.strictEqual(
        this.needToCallTraverse, false,
        "Must either call this.traverse or return false in " + methodName
    );

    var path = this.currentPath;
    return path && path.value;
};

sharedContextProtoMethods.traverse =
function traverse(path, newVisitor) {
    assert.ok(this instanceof this.Context);
    assert.ok(path instanceof NodePath);
    assert.ok(this.currentPath instanceof NodePath);

    this.needToCallTraverse = false;

    return visitChildren(path, PathVisitor.fromMethodsObject(
        newVisitor || this.visitor
    ));
};

sharedContextProtoMethods.visit =
function visit(path, newVisitor) {
    assert.ok(this instanceof this.Context);
    assert.ok(path instanceof NodePath);
    assert.ok(this.currentPath instanceof NodePath);

    this.needToCallTraverse = false;

    return PathVisitor.fromMethodsObject(
        newVisitor || this.visitor
    ).visitWithoutReset(path);
};

sharedContextProtoMethods.reportChanged = function reportChanged() {
    this.visitor.reportChanged();
};

sharedContextProtoMethods.abort = function abort() {
    this.needToCallTraverse = false;
    this.visitor.abort();
};

module.exports = PathVisitor;

},{"./node-path":180,"./types":185,"assert":188}],182:[function(require,module,exports){
var assert = require("assert");
var Op = Object.prototype;
var hasOwn = Op.hasOwnProperty;
var types = require("./types");
var isArray = types.builtInTypes.array;
var isNumber = types.builtInTypes.number;
var Ap = Array.prototype;
var slice = Ap.slice;
var map = Ap.map;

function Path(value, parentPath, name) {
    assert.ok(this instanceof Path);

    if (parentPath) {
        assert.ok(parentPath instanceof Path);
    } else {
        parentPath = null;
        name = null;
    }

    // The value encapsulated by this Path, generally equal to
    // parentPath.value[name] if we have a parentPath.
    this.value = value;

    // The immediate parent Path of this Path.
    this.parentPath = parentPath;

    // The name of the property of parentPath.value through which this
    // Path's value was reached.
    this.name = name;

    // Calling path.get("child") multiple times always returns the same
    // child Path object, for both performance and consistency reasons.
    this.__childCache = null;
}

var Pp = Path.prototype;

function getChildCache(path) {
    // Lazily create the child cache. This also cheapens cache
    // invalidation, since you can just reset path.__childCache to null.
    return path.__childCache || (path.__childCache = Object.create(null));
}

function getChildPath(path, name) {
    var cache = getChildCache(path);
    var actualChildValue = path.getValueProperty(name);
    var childPath = cache[name];
    if (!hasOwn.call(cache, name) ||
        // Ensure consistency between cache and reality.
        childPath.value !== actualChildValue) {
        childPath = cache[name] = new path.constructor(
            actualChildValue, path, name
        );
    }
    return childPath;
}

// This method is designed to be overridden by subclasses that need to
// handle missing properties, etc.
Pp.getValueProperty = function getValueProperty(name) {
    return this.value[name];
};

Pp.get = function get(name) {
    var path = this;
    var names = arguments;
    var count = names.length;

    for (var i = 0; i < count; ++i) {
        path = getChildPath(path, names[i]);
    }

    return path;
};

Pp.each = function each(callback, context) {
    var childPaths = [];
    var len = this.value.length;
    var i = 0;

    // Collect all the original child paths before invoking the callback.
    for (var i = 0; i < len; ++i) {
        if (hasOwn.call(this.value, i)) {
            childPaths[i] = this.get(i);
        }
    }

    // Invoke the callback on just the original child paths, regardless of
    // any modifications made to the array by the callback. I chose these
    // semantics over cleverly invoking the callback on new elements because
    // this way is much easier to reason about.
    context = context || this;
    for (i = 0; i < len; ++i) {
        if (hasOwn.call(childPaths, i)) {
            callback.call(context, childPaths[i]);
        }
    }
};

Pp.map = function map(callback, context) {
    var result = [];

    this.each(function(childPath) {
        result.push(callback.call(this, childPath));
    }, context);

    return result;
};

Pp.filter = function filter(callback, context) {
    var result = [];

    this.each(function(childPath) {
        if (callback.call(this, childPath)) {
            result.push(childPath);
        }
    }, context);

    return result;
};

function emptyMoves() {}
function getMoves(path, offset, start, end) {
    isArray.assert(path.value);

    if (offset === 0) {
        return emptyMoves;
    }

    var length = path.value.length;
    if (length < 1) {
        return emptyMoves;
    }

    var argc = arguments.length;
    if (argc === 2) {
        start = 0;
        end = length;
    } else if (argc === 3) {
        start = Math.max(start, 0);
        end = length;
    } else {
        start = Math.max(start, 0);
        end = Math.min(end, length);
    }

    isNumber.assert(start);
    isNumber.assert(end);

    var moves = Object.create(null);
    var cache = getChildCache(path);

    for (var i = start; i < end; ++i) {
        if (hasOwn.call(path.value, i)) {
            var childPath = path.get(i);
            assert.strictEqual(childPath.name, i);
            var newIndex = i + offset;
            childPath.name = newIndex;
            moves[newIndex] = childPath;
            delete cache[i];
        }
    }

    delete cache.length;

    return function() {
        for (var newIndex in moves) {
            var childPath = moves[newIndex];
            assert.strictEqual(childPath.name, +newIndex);
            cache[newIndex] = childPath;
            path.value[newIndex] = childPath.value;
        }
    };
}

Pp.shift = function shift() {
    var move = getMoves(this, -1);
    var result = this.value.shift();
    move();
    return result;
};

Pp.unshift = function unshift(node) {
    var move = getMoves(this, arguments.length);
    var result = this.value.unshift.apply(this.value, arguments);
    move();
    return result;
};

Pp.push = function push(node) {
    isArray.assert(this.value);
    delete getChildCache(this).length
    return this.value.push.apply(this.value, arguments);
};

Pp.pop = function pop() {
    isArray.assert(this.value);
    var cache = getChildCache(this);
    delete cache[this.value.length - 1];
    delete cache.length;
    return this.value.pop();
};

Pp.insertAt = function insertAt(index, node) {
    var argc = arguments.length;
    var move = getMoves(this, argc - 1, index);
    if (move === emptyMoves) {
        return this;
    }

    index = Math.max(index, 0);

    for (var i = 1; i < argc; ++i) {
        this.value[index + i - 1] = arguments[i];
    }

    move();

    return this;
};

Pp.insertBefore = function insertBefore(node) {
    var pp = this.parentPath;
    var argc = arguments.length;
    var insertAtArgs = [this.name];
    for (var i = 0; i < argc; ++i) {
        insertAtArgs.push(arguments[i]);
    }
    return pp.insertAt.apply(pp, insertAtArgs);
};

Pp.insertAfter = function insertAfter(node) {
    var pp = this.parentPath;
    var argc = arguments.length;
    var insertAtArgs = [this.name + 1];
    for (var i = 0; i < argc; ++i) {
        insertAtArgs.push(arguments[i]);
    }
    return pp.insertAt.apply(pp, insertAtArgs);
};

function repairRelationshipWithParent(path) {
    assert.ok(path instanceof Path);

    var pp = path.parentPath;
    if (!pp) {
        // Orphan paths have no relationship to repair.
        return path;
    }

    var parentValue = pp.value;
    var parentCache = getChildCache(pp);

    // Make sure parentCache[path.name] is populated.
    if (parentValue[path.name] === path.value) {
        parentCache[path.name] = path;
    } else if (isArray.check(parentValue)) {
        // Something caused path.name to become out of date, so attempt to
        // recover by searching for path.value in parentValue.
        var i = parentValue.indexOf(path.value);
        if (i >= 0) {
            parentCache[path.name = i] = path;
        }
    } else {
        // If path.value disagrees with parentValue[path.name], and
        // path.name is not an array index, let path.value become the new
        // parentValue[path.name] and update parentCache accordingly.
        parentValue[path.name] = path.value;
        parentCache[path.name] = path;
    }

    assert.strictEqual(parentValue[path.name], path.value);
    assert.strictEqual(path.parentPath.get(path.name), path);

    return path;
}

Pp.replace = function replace(replacement) {
    var results = [];
    var parentValue = this.parentPath.value;
    var parentCache = getChildCache(this.parentPath);
    var count = arguments.length;

    repairRelationshipWithParent(this);

    if (isArray.check(parentValue)) {
        var originalLength = parentValue.length;
        var move = getMoves(this.parentPath, count - 1, this.name + 1);

        var spliceArgs = [this.name, 1];
        for (var i = 0; i < count; ++i) {
            spliceArgs.push(arguments[i]);
        }

        var splicedOut = parentValue.splice.apply(parentValue, spliceArgs);

        assert.strictEqual(splicedOut[0], this.value);
        assert.strictEqual(
            parentValue.length,
            originalLength - 1 + count
        );

        move();

        if (count === 0) {
            delete this.value;
            delete parentCache[this.name];
            this.__childCache = null;

        } else {
            assert.strictEqual(parentValue[this.name], replacement);

            if (this.value !== replacement) {
                this.value = replacement;
                this.__childCache = null;
            }

            for (i = 0; i < count; ++i) {
                results.push(this.parentPath.get(this.name + i));
            }

            assert.strictEqual(results[0], this);
        }

    } else if (count === 1) {
        if (this.value !== replacement) {
            this.__childCache = null;
        }
        this.value = parentValue[this.name] = replacement;
        results.push(this);

    } else if (count === 0) {
        delete parentValue[this.name];
        delete this.value;
        this.__childCache = null;

        // Leave this path cached as parentCache[this.name], even though
        // it no longer has a value defined.

    } else {
        assert.ok(false, "Could not replace path");
    }

    return results;
};

module.exports = Path;

},{"./types":185,"assert":188}],183:[function(require,module,exports){
var assert = require("assert");
var types = require("./types");
var Type = types.Type;
var namedTypes = types.namedTypes;
var Node = namedTypes.Node;
var Expression = namedTypes.Expression;
var isArray = types.builtInTypes.array;
var hasOwn = Object.prototype.hasOwnProperty;
var b = types.builders;

function Scope(path, parentScope) {
    assert.ok(this instanceof Scope);
    assert.ok(path instanceof require("./node-path"));
    ScopeType.assert(path.value);

    var depth;

    if (parentScope) {
        assert.ok(parentScope instanceof Scope);
        depth = parentScope.depth + 1;
    } else {
        parentScope = null;
        depth = 0;
    }

    Object.defineProperties(this, {
        path: { value: path },
        node: { value: path.value },
        isGlobal: { value: !parentScope, enumerable: true },
        depth: { value: depth },
        parent: { value: parentScope },
        bindings: { value: {} }
    });
}

var scopeTypes = [
    // Program nodes introduce global scopes.
    namedTypes.Program,

    // Function is the supertype of FunctionExpression,
    // FunctionDeclaration, ArrowExpression, etc.
    namedTypes.Function,

    // In case you didn't know, the caught parameter shadows any variable
    // of the same name in an outer scope.
    namedTypes.CatchClause
];

var ScopeType = Type.or.apply(Type, scopeTypes);

Scope.isEstablishedBy = function(node) {
    return ScopeType.check(node);
};

var Sp = Scope.prototype;

// Will be overridden after an instance lazily calls scanScope.
Sp.didScan = false;

Sp.declares = function(name) {
    this.scan();
    return hasOwn.call(this.bindings, name);
};

Sp.declareTemporary = function(prefix) {
    if (prefix) {
        assert.ok(/^[a-z$_]/i.test(prefix), prefix);
    } else {
        prefix = "t$";
    }

    // Include this.depth in the name to make sure the name does not
    // collide with any variables in nested/enclosing scopes.
    prefix += this.depth.toString(36) + "$";

    this.scan();

    var index = 0;
    while (this.declares(prefix + index)) {
        ++index;
    }

    var name = prefix + index;
    return this.bindings[name] = types.builders.identifier(name);
};

Sp.injectTemporary = function(identifier, init) {
    identifier || (identifier = this.declareTemporary());

    var bodyPath = this.path.get("body");
    if (namedTypes.BlockStatement.check(bodyPath.value)) {
        bodyPath = bodyPath.get("body");
    }

    bodyPath.unshift(
        b.variableDeclaration(
            "var",
            [b.variableDeclarator(identifier, init || null)]
        )
    );

    return identifier;
};

Sp.scan = function(force) {
    if (force || !this.didScan) {
        for (var name in this.bindings) {
            // Empty out this.bindings, just in cases.
            delete this.bindings[name];
        }
        scanScope(this.path, this.bindings);
        this.didScan = true;
    }
};

Sp.getBindings = function () {
    this.scan();
    return this.bindings;
};

function scanScope(path, bindings) {
    var node = path.value;
    ScopeType.assert(node);

    if (namedTypes.CatchClause.check(node)) {
        // A catch clause establishes a new scope but the only variable
        // bound in that scope is the catch parameter. Any other
        // declarations create bindings in the outer scope.
        addPattern(path.get("param"), bindings);

    } else {
        recursiveScanScope(path, bindings);
    }
}

function recursiveScanScope(path, bindings) {
    var node = path.value;

    if (path.parent &&
        namedTypes.FunctionExpression.check(path.parent.node) &&
        path.parent.node.id) {
        addPattern(path.parent.get("id"), bindings);
    }

    if (!node) {
        // None of the remaining cases matter if node is falsy.

    } else if (isArray.check(node)) {
        path.each(function(childPath) {
            recursiveScanChild(childPath, bindings);
        });

    } else if (namedTypes.Function.check(node)) {
        path.get("params").each(function(paramPath) {
            addPattern(paramPath, bindings);
        });

        recursiveScanChild(path.get("body"), bindings);

    } else if (namedTypes.VariableDeclarator.check(node)) {
        addPattern(path.get("id"), bindings);
        recursiveScanChild(path.get("init"), bindings);

    } else if (node.type === "ImportSpecifier" ||
               node.type === "ImportNamespaceSpecifier" ||
               node.type === "ImportDefaultSpecifier") {
        addPattern(
            // Esprima used to use the .name field to refer to the local
            // binding identifier for ImportSpecifier nodes, but .id for
            // ImportNamespaceSpecifier and ImportDefaultSpecifier nodes.
            // ESTree/Acorn/ESpree use .local for all three node types.
            path.get(node.local ? "local" :
                     node.name ? "name" : "id"),
            bindings
        );

    } else if (Node.check(node) && !Expression.check(node)) {
        types.eachField(node, function(name, child) {
            var childPath = path.get(name);
            assert.strictEqual(childPath.value, child);
            recursiveScanChild(childPath, bindings);
        });
    }
}

function recursiveScanChild(path, bindings) {
    var node = path.value;

    if (!node || Expression.check(node)) {
        // Ignore falsy values and Expressions.

    } else if (namedTypes.FunctionDeclaration.check(node)) {
        addPattern(path.get("id"), bindings);

    } else if (namedTypes.ClassDeclaration &&
               namedTypes.ClassDeclaration.check(node)) {
        addPattern(path.get("id"), bindings);

    } else if (ScopeType.check(node)) {
        if (namedTypes.CatchClause.check(node)) {
            var catchParamName = node.param.name;
            var hadBinding = hasOwn.call(bindings, catchParamName);

            // Any declarations that occur inside the catch body that do
            // not have the same name as the catch parameter should count
            // as bindings in the outer scope.
            recursiveScanScope(path.get("body"), bindings);

            // If a new binding matching the catch parameter name was
            // created while scanning the catch body, ignore it because it
            // actually refers to the catch parameter and not the outer
            // scope that we're currently scanning.
            if (!hadBinding) {
                delete bindings[catchParamName];
            }
        }

    } else {
        recursiveScanScope(path, bindings);
    }
}

function addPattern(patternPath, bindings) {
    var pattern = patternPath.value;
    namedTypes.Pattern.assert(pattern);

    if (namedTypes.Identifier.check(pattern)) {
        if (hasOwn.call(bindings, pattern.name)) {
            bindings[pattern.name].push(patternPath);
        } else {
            bindings[pattern.name] = [patternPath];
        }

    } else if (namedTypes.ObjectPattern &&
               namedTypes.ObjectPattern.check(pattern)) {
        patternPath.get('properties').each(function(propertyPath) {
            var property = propertyPath.value;
            if (namedTypes.Pattern.check(property)) {
                addPattern(propertyPath, bindings);
            } else  if (namedTypes.Property.check(property)) {
                addPattern(propertyPath.get('value'), bindings);
            } else if (namedTypes.SpreadProperty &&
                       namedTypes.SpreadProperty.check(property)) {
                addPattern(propertyPath.get('argument'), bindings);
            }
        });

    } else if (namedTypes.ArrayPattern &&
               namedTypes.ArrayPattern.check(pattern)) {
        patternPath.get('elements').each(function(elementPath) {
            var element = elementPath.value;
            if (namedTypes.Pattern.check(element)) {
                addPattern(elementPath, bindings);
            } else if (namedTypes.SpreadElement &&
                       namedTypes.SpreadElement.check(element)) {
                addPattern(elementPath.get("argument"), bindings);
            }
        });

    } else if (namedTypes.PropertyPattern &&
               namedTypes.PropertyPattern.check(pattern)) {
        addPattern(patternPath.get('pattern'), bindings);

    } else if ((namedTypes.SpreadElementPattern &&
                namedTypes.SpreadElementPattern.check(pattern)) ||
               (namedTypes.SpreadPropertyPattern &&
                namedTypes.SpreadPropertyPattern.check(pattern))) {
        addPattern(patternPath.get('argument'), bindings);
    }
}

Sp.lookup = function(name) {
    for (var scope = this; scope; scope = scope.parent)
        if (scope.declares(name))
            break;
    return scope;
};

Sp.getGlobalScope = function() {
    var scope = this;
    while (!scope.isGlobal)
        scope = scope.parent;
    return scope;
};

module.exports = Scope;

},{"./node-path":180,"./types":185,"assert":188}],184:[function(require,module,exports){
var types = require("../lib/types");
var Type = types.Type;
var builtin = types.builtInTypes;
var isNumber = builtin.number;

// An example of constructing a new type with arbitrary constraints from
// an existing type.
exports.geq = function(than) {
    return new Type(function(value) {
        return isNumber.check(value) && value >= than;
    }, isNumber + " >= " + than);
};

// Default value-returning functions that may optionally be passed as a
// third argument to Def.prototype.field.
exports.defaults = {
    // Functions were used because (among other reasons) that's the most
    // elegant way to allow for the emptyArray one always to give a new
    // array instance.
    "null": function() { return null },
    "emptyArray": function() { return [] },
    "false": function() { return false },
    "true": function() { return true },
    "undefined": function() {}
};

var naiveIsPrimitive = Type.or(
    builtin.string,
    builtin.number,
    builtin.boolean,
    builtin.null,
    builtin.undefined
);

exports.isPrimitive = new Type(function(value) {
    if (value === null)
        return true;
    var type = typeof value;
    return !(type === "object" ||
             type === "function");
}, naiveIsPrimitive.toString());

},{"../lib/types":185}],185:[function(require,module,exports){
var assert = require("assert");
var Ap = Array.prototype;
var slice = Ap.slice;
var map = Ap.map;
var each = Ap.forEach;
var Op = Object.prototype;
var objToStr = Op.toString;
var funObjStr = objToStr.call(function(){});
var strObjStr = objToStr.call("");
var hasOwn = Op.hasOwnProperty;

// A type is an object with a .check method that takes a value and returns
// true or false according to whether the value matches the type.

function Type(check, name) {
    var self = this;
    assert.ok(self instanceof Type, self);

    // Unfortunately we can't elegantly reuse isFunction and isString,
    // here, because this code is executed while defining those types.
    assert.strictEqual(objToStr.call(check), funObjStr,
                       check + " is not a function");

    // The `name` parameter can be either a function or a string.
    var nameObjStr = objToStr.call(name);
    assert.ok(nameObjStr === funObjStr ||
              nameObjStr === strObjStr,
              name + " is neither a function nor a string");

    Object.defineProperties(self, {
        name: { value: name },
        check: {
            value: function(value, deep) {
                var result = check.call(self, value, deep);
                if (!result && deep && objToStr.call(deep) === funObjStr)
                    deep(self, value);
                return result;
            }
        }
    });
}

var Tp = Type.prototype;

// Throughout this file we use Object.defineProperty to prevent
// redefinition of exported properties.
exports.Type = Type;

// Like .check, except that failure triggers an AssertionError.
Tp.assert = function(value, deep) {
    if (!this.check(value, deep)) {
        var str = shallowStringify(value);
        assert.ok(false, str + " does not match type " + this);
        return false;
    }
    return true;
};

function shallowStringify(value) {
    if (isObject.check(value))
        return "{" + Object.keys(value).map(function(key) {
            return key + ": " + value[key];
        }).join(", ") + "}";

    if (isArray.check(value))
        return "[" + value.map(shallowStringify).join(", ") + "]";

    return JSON.stringify(value);
}

Tp.toString = function() {
    var name = this.name;

    if (isString.check(name))
        return name;

    if (isFunction.check(name))
        return name.call(this) + "";

    return name + " type";
};

var builtInTypes = {};
exports.builtInTypes = builtInTypes;

function defBuiltInType(example, name) {
    var objStr = objToStr.call(example);

    Object.defineProperty(builtInTypes, name, {
        enumerable: true,
        value: new Type(function(value) {
            return objToStr.call(value) === objStr;
        }, name)
    });

    return builtInTypes[name];
}

// These types check the underlying [[Class]] attribute of the given
// value, rather than using the problematic typeof operator. Note however
// that no subtyping is considered; so, for instance, isObject.check
// returns false for [], /./, new Date, and null.
var isString = defBuiltInType("", "string");
var isFunction = defBuiltInType(function(){}, "function");
var isArray = defBuiltInType([], "array");
var isObject = defBuiltInType({}, "object");
var isRegExp = defBuiltInType(/./, "RegExp");
var isDate = defBuiltInType(new Date, "Date");
var isNumber = defBuiltInType(3, "number");
var isBoolean = defBuiltInType(true, "boolean");
var isNull = defBuiltInType(null, "null");
var isUndefined = defBuiltInType(void 0, "undefined");

// There are a number of idiomatic ways of expressing types, so this
// function serves to coerce them all to actual Type objects. Note that
// providing the name argument is not necessary in most cases.
function toType(from, name) {
    // The toType function should of course be idempotent.
    if (from instanceof Type)
        return from;

    // The Def type is used as a helper for constructing compound
    // interface types for AST nodes.
    if (from instanceof Def)
        return from.type;

    // Support [ElemType] syntax.
    if (isArray.check(from))
        return Type.fromArray(from);

    // Support { someField: FieldType, ... } syntax.
    if (isObject.check(from))
        return Type.fromObject(from);

    // If isFunction.check(from), assume that from is a binary predicate
    // function we can use to define the type.
    if (isFunction.check(from))
        return new Type(from, name);

    // As a last resort, toType returns a type that matches any value that
    // is === from. This is primarily useful for literal values like
    // toType(null), but it has the additional advantage of allowing
    // toType to be a total function.
    return new Type(function(value) {
        return value === from;
    }, isUndefined.check(name) ? function() {
        return from + "";
    } : name);
}

// Returns a type that matches the given value iff any of type1, type2,
// etc. match the value.
Type.or = function(/* type1, type2, ... */) {
    var types = [];
    var len = arguments.length;
    for (var i = 0; i < len; ++i)
        types.push(toType(arguments[i]));

    return new Type(function(value, deep) {
        for (var i = 0; i < len; ++i)
            if (types[i].check(value, deep))
                return true;
        return false;
    }, function() {
        return types.join(" | ");
    });
};

Type.fromArray = function(arr) {
    assert.ok(isArray.check(arr));
    assert.strictEqual(
        arr.length, 1,
        "only one element type is permitted for typed arrays");
    return toType(arr[0]).arrayOf();
};

Tp.arrayOf = function() {
    var elemType = this;
    return new Type(function(value, deep) {
        return isArray.check(value) && value.every(function(elem) {
            return elemType.check(elem, deep);
        });
    }, function() {
        return "[" + elemType + "]";
    });
};

Type.fromObject = function(obj) {
    var fields = Object.keys(obj).map(function(name) {
        return new Field(name, obj[name]);
    });

    return new Type(function(value, deep) {
        return isObject.check(value) && fields.every(function(field) {
            return field.type.check(value[field.name], deep);
        });
    }, function() {
        return "{ " + fields.join(", ") + " }";
    });
};

function Field(name, type, defaultFn, hidden) {
    var self = this;

    assert.ok(self instanceof Field);
    isString.assert(name);

    type = toType(type);

    var properties = {
        name: { value: name },
        type: { value: type },
        hidden: { value: !!hidden }
    };

    if (isFunction.check(defaultFn)) {
        properties.defaultFn = { value: defaultFn };
    }

    Object.defineProperties(self, properties);
}

var Fp = Field.prototype;

Fp.toString = function() {
    return JSON.stringify(this.name) + ": " + this.type;
};

Fp.getValue = function(obj) {
    var value = obj[this.name];

    if (!isUndefined.check(value))
        return value;

    if (this.defaultFn)
        value = this.defaultFn.call(obj);

    return value;
};

// Define a type whose name is registered in a namespace (the defCache) so
// that future definitions will return the same type given the same name.
// In particular, this system allows for circular and forward definitions.
// The Def object d returned from Type.def may be used to configure the
// type d.type by calling methods such as d.bases, d.build, and d.field.
Type.def = function(typeName) {
    isString.assert(typeName);
    return hasOwn.call(defCache, typeName)
        ? defCache[typeName]
        : defCache[typeName] = new Def(typeName);
};

// In order to return the same Def instance every time Type.def is called
// with a particular name, those instances need to be stored in a cache.
var defCache = Object.create(null);

function Def(typeName) {
    var self = this;
    assert.ok(self instanceof Def);

    Object.defineProperties(self, {
        typeName: { value: typeName },
        baseNames: { value: [] },
        ownFields: { value: Object.create(null) },

        // These two are populated during finalization.
        allSupertypes: { value: Object.create(null) }, // Includes own typeName.
        supertypeList: { value: [] }, // Linear inheritance hierarchy.
        allFields: { value: Object.create(null) }, // Includes inherited fields.
        fieldNames: { value: [] }, // Non-hidden keys of allFields.

        type: {
            value: new Type(function(value, deep) {
                return self.check(value, deep);
            }, typeName)
        }
    });
}

Def.fromValue = function(value) {
    if (value && typeof value === "object") {
        var type = value.type;
        if (typeof type === "string" &&
            hasOwn.call(defCache, type)) {
            var d = defCache[type];
            if (d.finalized) {
                return d;
            }
        }
    }

    return null;
};

var Dp = Def.prototype;

Dp.isSupertypeOf = function(that) {
    if (that instanceof Def) {
        assert.strictEqual(this.finalized, true);
        assert.strictEqual(that.finalized, true);
        return hasOwn.call(that.allSupertypes, this.typeName);
    } else {
        assert.ok(false, that + " is not a Def");
    }
};

// Note that the list returned by this function is a copy of the internal
// supertypeList, *without* the typeName itself as the first element.
exports.getSupertypeNames = function(typeName) {
    assert.ok(hasOwn.call(defCache, typeName));
    var d = defCache[typeName];
    assert.strictEqual(d.finalized, true);
    return d.supertypeList.slice(1);
};

// Returns an object mapping from every known type in the defCache to the
// most specific supertype whose name is an own property of the candidates
// object.
exports.computeSupertypeLookupTable = function(candidates) {
    var table = {};
    var typeNames = Object.keys(defCache);
    var typeNameCount = typeNames.length;

    for (var i = 0; i < typeNameCount; ++i) {
        var typeName = typeNames[i];
        var d = defCache[typeName];
        assert.strictEqual(d.finalized, true);
        for (var j = 0; j < d.supertypeList.length; ++j) {
            var superTypeName = d.supertypeList[j];
            if (hasOwn.call(candidates, superTypeName)) {
                table[typeName] = superTypeName;
                break;
            }
        }
    }

    return table;
};

Dp.checkAllFields = function(value, deep) {
    var allFields = this.allFields;
    assert.strictEqual(this.finalized, true);

    function checkFieldByName(name) {
        var field = allFields[name];
        var type = field.type;
        var child = field.getValue(value);
        return type.check(child, deep);
    }

    return isObject.check(value)
        && Object.keys(allFields).every(checkFieldByName);
};

Dp.check = function(value, deep) {
    assert.strictEqual(
        this.finalized, true,
        "prematurely checking unfinalized type " + this.typeName);

    // A Def type can only match an object value.
    if (!isObject.check(value))
        return false;

    var vDef = Def.fromValue(value);
    if (!vDef) {
        // If we couldn't infer the Def associated with the given value,
        // and we expected it to be a SourceLocation or a Position, it was
        // probably just missing a "type" field (because Esprima does not
        // assign a type property to such nodes). Be optimistic and let
        // this.checkAllFields make the final decision.
        if (this.typeName === "SourceLocation" ||
            this.typeName === "Position") {
            return this.checkAllFields(value, deep);
        }

        // Calling this.checkAllFields for any other type of node is both
        // bad for performance and way too forgiving.
        return false;
    }

    // If checking deeply and vDef === this, then we only need to call
    // checkAllFields once. Calling checkAllFields is too strict when deep
    // is false, because then we only care about this.isSupertypeOf(vDef).
    if (deep && vDef === this)
        return this.checkAllFields(value, deep);

    // In most cases we rely exclusively on isSupertypeOf to make O(1)
    // subtyping determinations. This suffices in most situations outside
    // of unit tests, since interface conformance is checked whenever new
    // instances are created using builder functions.
    if (!this.isSupertypeOf(vDef))
        return false;

    // The exception is when deep is true; then, we recursively check all
    // fields.
    if (!deep)
        return true;

    // Use the more specific Def (vDef) to perform the deep check, but
    // shallow-check fields defined by the less specific Def (this).
    return vDef.checkAllFields(value, deep)
        && this.checkAllFields(value, false);
};

Dp.bases = function() {
    var bases = this.baseNames;

    assert.strictEqual(this.finalized, false);

    each.call(arguments, function(baseName) {
        isString.assert(baseName);

        // This indexOf lookup may be O(n), but the typical number of base
        // names is very small, and indexOf is a native Array method.
        if (bases.indexOf(baseName) < 0)
            bases.push(baseName);
    });

    return this; // For chaining.
};

// False by default until .build(...) is called on an instance.
Object.defineProperty(Dp, "buildable", { value: false });

var builders = {};
exports.builders = builders;

// This object is used as prototype for any node created by a builder.
var nodePrototype = {};

// Call this function to define a new method to be shared by all AST
// nodes. The replaced method (if any) is returned for easy wrapping.
exports.defineMethod = function(name, func) {
    var old = nodePrototype[name];

    // Pass undefined as func to delete nodePrototype[name].
    if (isUndefined.check(func)) {
        delete nodePrototype[name];

    } else {
        isFunction.assert(func);

        Object.defineProperty(nodePrototype, name, {
            enumerable: true, // For discoverability.
            configurable: true, // For delete proto[name].
            value: func
        });
    }

    return old;
};

// Calling the .build method of a Def simultaneously marks the type as
// buildable (by defining builders[getBuilderName(typeName)]) and
// specifies the order of arguments that should be passed to the builder
// function to create an instance of the type.
Dp.build = function(/* param1, param2, ... */) {
    var self = this;

    // Calling Def.prototype.build multiple times has the effect of merely
    // redefining this property.
    Object.defineProperty(self, "buildParams", {
        value: slice.call(arguments),
        writable: false,
        enumerable: false,
        configurable: true
    });

    assert.strictEqual(self.finalized, false);
    isString.arrayOf().assert(self.buildParams);

    if (self.buildable) {
        // If this Def is already buildable, update self.buildParams and
        // continue using the old builder function.
        return self;
    }

    // Every buildable type will have its "type" field filled in
    // automatically. This includes types that are not subtypes of Node,
    // like SourceLocation, but that seems harmless (TODO?).
    self.field("type", self.typeName, function() { return self.typeName });

    // Override Dp.buildable for this Def instance.
    Object.defineProperty(self, "buildable", { value: true });

    Object.defineProperty(builders, getBuilderName(self.typeName), {
        enumerable: true,

        value: function() {
            var args = arguments;
            var argc = args.length;
            var built = Object.create(nodePrototype);

            assert.ok(
                self.finalized,
                "attempting to instantiate unfinalized type " + self.typeName);

            function add(param, i) {
                if (hasOwn.call(built, param))
                    return;

                var all = self.allFields;
                assert.ok(hasOwn.call(all, param), param);

                var field = all[param];
                var type = field.type;
                var value;

                if (isNumber.check(i) && i < argc) {
                    value = args[i];
                } else if (field.defaultFn) {
                    // Expose the partially-built object to the default
                    // function as its `this` object.
                    value = field.defaultFn.call(built);
                } else {
                    var message = "no value or default function given for field " +
                        JSON.stringify(param) + " of " + self.typeName + "(" +
                            self.buildParams.map(function(name) {
                                return all[name];
                            }).join(", ") + ")";
                    assert.ok(false, message);
                }

                if (!type.check(value)) {
                    assert.ok(
                        false,
                        shallowStringify(value) +
                            " does not match field " + field +
                            " of type " + self.typeName
                    );
                }

                // TODO Could attach getters and setters here to enforce
                // dynamic type safety.
                built[param] = value;
            }

            self.buildParams.forEach(function(param, i) {
                add(param, i);
            });

            Object.keys(self.allFields).forEach(function(param) {
                add(param); // Use the default value.
            });

            // Make sure that the "type" field was filled automatically.
            assert.strictEqual(built.type, self.typeName);

            return built;
        }
    });

    return self; // For chaining.
};

function getBuilderName(typeName) {
    return typeName.replace(/^[A-Z]+/, function(upperCasePrefix) {
        var len = upperCasePrefix.length;
        switch (len) {
        case 0: return "";
        // If there's only one initial capital letter, just lower-case it.
        case 1: return upperCasePrefix.toLowerCase();
        default:
            // If there's more than one initial capital letter, lower-case
            // all but the last one, so that XMLDefaultDeclaration (for
            // example) becomes xmlDefaultDeclaration.
            return upperCasePrefix.slice(
                0, len - 1).toLowerCase() +
                upperCasePrefix.charAt(len - 1);
        }
    });
}

// The reason fields are specified using .field(...) instead of an object
// literal syntax is somewhat subtle: the object literal syntax would
// support only one key and one value, but with .field(...) we can pass
// any number of arguments to specify the field.
Dp.field = function(name, type, defaultFn, hidden) {
    assert.strictEqual(this.finalized, false);
    this.ownFields[name] = new Field(name, type, defaultFn, hidden);
    return this; // For chaining.
};

var namedTypes = {};
exports.namedTypes = namedTypes;

// Like Object.keys, but aware of what fields each AST type should have.
function getFieldNames(object) {
    var d = Def.fromValue(object);
    if (d) {
        return d.fieldNames.slice(0);
    }

    if ("type" in object) {
        assert.ok(
            false,
            "did not recognize object of type " +
                JSON.stringify(object.type)
        );
    }

    return Object.keys(object);
}
exports.getFieldNames = getFieldNames;

// Get the value of an object property, taking object.type and default
// functions into account.
function getFieldValue(object, fieldName) {
    var d = Def.fromValue(object);
    if (d) {
        var field = d.allFields[fieldName];
        if (field) {
            return field.getValue(object);
        }
    }

    return object[fieldName];
}
exports.getFieldValue = getFieldValue;

// Iterate over all defined fields of an object, including those missing
// or undefined, passing each field name and effective value (as returned
// by getFieldValue) to the callback. If the object has no corresponding
// Def, the callback will never be called.
exports.eachField = function(object, callback, context) {
    getFieldNames(object).forEach(function(name) {
        callback.call(this, name, getFieldValue(object, name));
    }, context);
};

// Similar to eachField, except that iteration stops as soon as the
// callback returns a truthy value. Like Array.prototype.some, the final
// result is either true or false to indicates whether the callback
// returned true for any element or not.
exports.someField = function(object, callback, context) {
    return getFieldNames(object).some(function(name) {
        return callback.call(this, name, getFieldValue(object, name));
    }, context);
};

// This property will be overridden as true by individual Def instances
// when they are finalized.
Object.defineProperty(Dp, "finalized", { value: false });

Dp.finalize = function() {
    // It's not an error to finalize a type more than once, but only the
    // first call to .finalize does anything.
    if (!this.finalized) {
        var allFields = this.allFields;
        var allSupertypes = this.allSupertypes;

        this.baseNames.forEach(function(name) {
            var def = defCache[name];
            def.finalize();
            extend(allFields, def.allFields);
            extend(allSupertypes, def.allSupertypes);
        });

        // TODO Warn if fields are overridden with incompatible types.
        extend(allFields, this.ownFields);
        allSupertypes[this.typeName] = this;

        this.fieldNames.length = 0;
        for (var fieldName in allFields) {
            if (hasOwn.call(allFields, fieldName) &&
                !allFields[fieldName].hidden) {
                this.fieldNames.push(fieldName);
            }
        }

        // Types are exported only once they have been finalized.
        Object.defineProperty(namedTypes, this.typeName, {
            enumerable: true,
            value: this.type
        });

        Object.defineProperty(this, "finalized", { value: true });

        // A linearization of the inheritance hierarchy.
        populateSupertypeList(this.typeName, this.supertypeList);
    }
};

function populateSupertypeList(typeName, list) {
    list.length = 0;
    list.push(typeName);

    var lastSeen = Object.create(null);

    for (var pos = 0; pos < list.length; ++pos) {
        typeName = list[pos];
        var d = defCache[typeName];
        assert.strictEqual(d.finalized, true);

        // If we saw typeName earlier in the breadth-first traversal,
        // delete the last-seen occurrence.
        if (hasOwn.call(lastSeen, typeName)) {
            delete list[lastSeen[typeName]];
        }

        // Record the new index of the last-seen occurrence of typeName.
        lastSeen[typeName] = pos;

        // Enqueue the base names of this type.
        list.push.apply(list, d.baseNames);
    }

    // Compaction loop to remove array holes.
    for (var to = 0, from = to, len = list.length; from < len; ++from) {
        if (hasOwn.call(list, from)) {
            list[to++] = list[from];
        }
    }

    list.length = to;
}

function extend(into, from) {
    Object.keys(from).forEach(function(name) {
        into[name] = from[name];
    });

    return into;
};

exports.finalize = function() {
    Object.keys(defCache).forEach(function(name) {
        defCache[name].finalize();
    });
};

},{"assert":188}],186:[function(require,module,exports){
var types = require("./lib/types");

// This core module of AST types captures ES5 as it is parsed today by
// git://github.com/ariya/esprima.git#master.
require("./def/core");

// Feel free to add to or remove from this list of extension modules to
// configure the precise type hierarchy that you need.
require("./def/es6");
require("./def/es7");
require("./def/mozilla");
require("./def/e4x");
require("./def/fb-harmony");

types.finalize();

exports.Type = types.Type;
exports.builtInTypes = types.builtInTypes;
exports.namedTypes = types.namedTypes;
exports.builders = types.builders;
exports.defineMethod = types.defineMethod;
exports.getFieldNames = types.getFieldNames;
exports.getFieldValue = types.getFieldValue;
exports.eachField = types.eachField;
exports.someField = types.someField;
exports.getSupertypeNames = types.getSupertypeNames;
exports.astNodesAreEquivalent = require("./lib/equiv");
exports.finalize = types.finalize;
exports.NodePath = require("./lib/node-path");
exports.PathVisitor = require("./lib/path-visitor");
exports.visit = exports.PathVisitor.visit;

},{"./def/core":173,"./def/e4x":174,"./def/es6":175,"./def/es7":176,"./def/fb-harmony":177,"./def/mozilla":178,"./lib/equiv":179,"./lib/node-path":180,"./lib/path-visitor":181,"./lib/types":185}],187:[function(require,module,exports){

},{}],188:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":214}],189:[function(require,module,exports){
arguments[4][187][0].apply(exports,arguments)
},{"dup":187}],190:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding) {
  var self = this
  if (!(self instanceof Buffer)) return new Buffer(subject, encoding)

  var type = typeof subject
  var length

  if (type === 'number') {
    length = +subject
  } else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) {
    // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data)) subject = subject.data
    length = +subject.length
  } else {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (length > kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum size: 0x' +
      kMaxLength.toString(16) + ' bytes')
  }

  if (length < 0) length = 0
  else length >>>= 0 // coerce to uint32

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    self = Buffer._augment(new Uint8Array(length)) // eslint-disable-line consistent-this
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    self.length = length
    self._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    self._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++) {
        self[i] = subject.readUInt8(i)
      }
    } else {
      for (i = 0; i < length; i++) {
        self[i] = ((subject[i] % 256) + 256) % 256
      }
    }
  } else if (type === 'string') {
    self.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT) {
    for (i = 0; i < length; i++) {
      self[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize) self.parent = rootParent

  return self
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, totalLength) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function byteLength (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, target_start, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - target_start < end - start) {
    end = target.length - target_start + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":191,"ieee754":192,"is-array":193}],191:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
