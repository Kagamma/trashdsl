/// ----- VirtualMachine -----

enum Opcode {
    Push,
    Operator,
    Assign,
    Pop,
    Jump,
    Call,
    Return
}
    enum Operator{
        Add,
        Sub,
        Mult,
        Div,
        Mod,
        Negative,
        Greater,
        Smaller,
        GreaterOrEqual,
        SmallerOrEqual,
        Equal,
        NotEqual,
        Inc,
        Dec,
    }
    enum Push {
        Const,
        LocalVar,
        LocalArray,
        LocalArrayPop,
        LocalRecord,
        LocalRecordArray,
        LocalRecordPop,
        Symbol,
        StackFrame
    }
    enum Pop {
        Const,
        StackFrame
    }
    enum Jump {
        Unconditional,
        Equal,
        NotEqual,
        Greater,
        GreaterOrEqual,
        Smaller,
        SmallerOrEqual
    }
    enum Call {
        Native,
        CodeBlock
    }
    enum Assign {
        Local,
        LocalArray,
        LocalRecord,
        LocalRecordArray,
        LocalRecordPop,
        Global
    }

class FuncInfo {
    func: any;
    argCount: number;
}

enum IdentType {
    Atom,
    Array,
    Record,
    Function
}

class IdentInfo {
    addr: number;
    kind: IdentType;
    isUsed: boolean;
    ln: number;
    col: number;
}

class CodeBlock {
    name: string;
    code: any[];
    arguments: any[];
    codePtr: number;

    constructor() {
        this.clear();
    }

    clear() {
        this.name = '';
        this.code = [];
        this.codePtr = 0;
        this.arguments = []];
    }

    getCurrentAddr(): number {
        return this.code.length;
    }

    patch(addr: number, data: any) {
        this.code[addr] = data;
    }

    emit(opcode: Opcode, data?: any[]): number {
        this.code.push(opcode);
        this.codePtr++;
        if (data != undefined) {
            for (let i = 0; i < data.length; i++) {
                this.code.push(data[i]);
            }
        }/*
        if (data != undefined) {
			switch (opcode) {
				case Opcode.Operator:
					console.log(Opcode[opcode] + ', ' + Operator[data[0]]);
					break;
				case Opcode.Push:
					console.log(Opcode[opcode] + ', ' + Push[data[0]] + ', ' + data[1] + ', ' + data[2]);
					break;
				case Opcode.Jump:
					console.log(Opcode[opcode] + ', ' + Jump[data[0]] + ', <addr>');
					break;
				case Opcode.Call:
					console.log(Opcode[opcode] + ', ' + Call[data[0]] + ', ' + data[1] + ', ' + data[2]);
					break;
				case Opcode.Assign:
					console.log(Opcode[opcode] + ', ' + Assign[data[0]] + ', ' + data[1] + ', StackFrame + ' + data[2] + ', ' + data[3]);
					break;
				default:
					console.log(Opcode[opcode] + ', ' + data.toString());
					break;
			}
		}
        else  
            console.log(Opcode[opcode]);*/
        return this.getCurrentAddr();
    }
}

class VirtualMachineInstance {
    nativeFuncMap: Map<string, FuncInfo>;
    constMap: Map<string, any>;
    globalVarMap: Map<string, any>; 
    cbMap: Map<string, CodeBlock>;

    constructor() {
        this.constMap = new Map<string, any>();
        this.globalVarMap = new Map<string, any>();
        this.nativeFuncMap = new Map<string, FuncInfo>();
        this.cbMap = new Map<string, CodeBlock>();
    }   

    registerCodeBlock(name: string): CodeBlock {
        let cb: CodeBlock = this.cbMap.get(name);
        if (cb == undefined) {
            cb = new CodeBlock();
            this.cbMap.set(name, cb);
        } else {
            cb.clear();
        }
        cb.name = name;
        return cb;
    }

    registerFunction(name: string, argCount: number, func: any) {
        let info = new FuncInfo();
        info.func = func;
        info.argCount = argCount;
        this.nativeFuncMap.set(name.toLowerCase(), info);
    }

    registerConstant(name: string, c: any) {
        this.constMap.set(name.toLowerCase(), c);
    }

    registerGlobalVar(name: string, c: any) {
        this.globalVarMap.set(name.toLowerCase(), c);
    }
}

class VirtualMachine {
    stack: any[];
    symbols: string[];
    codePtr: number;
    codePtrStack: any[];
    vmInst: VirtualMachineInstance;
    stackFrameList: number[];
	
    constructor(vmInst: VirtualMachineInstance) {
        this.reset();
        this.nativeFuncMap = new Map<string, FuncInfo>;
        this.vmInst = vmInst;
	}

    getResult(): any {
        return this.stack[0];
    }

    reset() {
        this.stack = [0];
        this.symbols = ['result'];
        this.codePtrStack = [];
        this.stackFrameList = [];
        this.stackFrameList.push(0);
    }
	
	private stackPush(v, n) {
        this.stack.push(v);
        this.symbols.push(n);
	}
	
	private stackPop(v): any {
        this.symbols.pop();
		return this.stack.pop();
	}
	
	private stackGet(i): any {
		return this.stack[i];
	}
	
	private stackGetArray(i, j): any {
		return this.stack[i][j];
	}
	
	private stackSet(i, v, n) {
        this.symbols[i] = n;
		this.stack[i] = v;
	}
	
    private stackSetArray(i, j, a) {
        let v: any = this.stack[i];
        if (typeof v == "string") {
            this.stack[i] = v.substr(0, j) + a.charAt(0) + v.substr(j + 1);
        } else {
            v[j] = a
        }
	}
	
    execute(cb: CodeBlock) {
        //console.log('----- Execute CodeBlock #' + cb.name + ' -----');
        this.codePtr = 0;

        let worker = () => {
            let count = 0;
            let a, b, c, d, r: any;
            while (this.codePtr < cb.code.length) {
                switch (cb.code[this.codePtr]) {
                    case Opcode.Push:
                        switch (cb.code[this.codePtr + 1]) {
                            case Push.Const:
                                this.stackPush(cb.code[this.codePtr + 2]);
                                this.codePtr += 3;
                                break;
                            case Push.LocalVar:
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 2];
                                this.stackPush(this.stackGet(a));
                                this.codePtr += 3;
                                break;
                            case Push.LocalArray:
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 2];
                                b = this.stackGet(a);
                                if (typeof b == "string")
                                    this.stackPush(b.charAt(this.stackPop()));
                                else
                                    this.stackPush(b[this.stackPop()]);
                                this.codePtr += 3;
                                break;
                            case Push.LocalArrayPop:
                                c = this.stackPop();
                                b = this.stackPop();
                                if (typeof b == "string")
                                    this.stackPush(b.charAt(c));
                                else
                                    this.stackPush(b[c]);
                                this.codePtr += 2;
                                break;
                            case Push.LocalRecord:
                                let loop: number = cb.code[this.codePtr + 3];
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 2];
                                let record = this.stackGet(a);
                                let props = [];
                                for (let i = 0; i < loop; i++)
                                    props.push(this.stackPop());
                                for (let i = 0; i < loop; i++) {
                                    c = props.pop();
                                    if (i < loop - 1)
                                        record = record[c];
                                    else
                                        this.stackPush(record[c]);
                                }
                                this.codePtr += 4;
                                break;
                            case Push.LocalRecordPop:
                                let loop: number = cb.code[this.codePtr + 2];
                                a = this.stack.length - loop - 1; 
                                let record = this.stackGet(a);
                                this.stack.splice(a, 1);
                                let props = [];
                                for (let i = 0; i < loop; i++)
                                    props.push(this.stackPop());
                                for (let i = 0; i < loop; i++) {
                                    c = props.pop();
                                    if (i < loop - 1)
                                        record = record[c];
                                    else
                                        this.stackPush(record[c]);
                                }
                                this.codePtr += 3;
                                break;
                            case Push.Symbol:
                                this.symbols[this.stack.length-1] = cb.code[this.codePtr + 2];
                                this.codePtr += 3;
                                break;
                            case Push.StackFrame:
                                this.stackFrameList.push(this.stack.length);
                                this.codePtr += 2;
                                break;
                        }
                        break;
                    case Opcode.Operator:
                        switch (cb.code[this.codePtr + 1]) {
                            case Operator.Add:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a + b);
                                this.codePtr += 2;
                                break;
                            case Operator.Sub:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a - b);
                                this.codePtr += 2;
                                break;
                            case Operator.Mult:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a * b);
                                this.codePtr += 2;
                                break;
                            case Operator.Div:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a / b);
                                this.codePtr += 2;
                                break;
                            case Operator.Mod:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a % b);
                                this.codePtr += 2;
                                break;
                            case Operator.Greater:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a > b);
                                this.codePtr += 2;
                                break;
                            case Operator.GreaterOrEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a >= b);
                                this.codePtr += 2;
                                break;
                            case Operator.Smaller:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a < b);
                                this.codePtr += 2;
                                break;
                            case Operator.SmallerOrEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a <= b);
                                this.codePtr += 2;
                                break;
                            case Operator.Equal:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a == b);
                                this.codePtr += 2;
                                break;
                            case Operator.NotEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                this.stackPush(a != b);
                                this.codePtr += 2;
                                break;
                            case Operator.Negative:
                                a = this.stackPop();
                                this.stackPush(-a);
                                this.codePtr += 2;
                                break;
                            case Operator.Inc:
                                a = this.stackPop();
                                this.stackPush(a + 1);
                                this.codePtr += 2;
                                break;
                            case Operator.Dec:
                                a = this.stackPop();
                                this.stackPush(a - 1);
                                this.codePtr += 2;
                                break;
                        }
                        break;
                    case Opcode.Pop:
                        switch (cb.code[this.codePtr + 1]) {
                            case Pop.Const:
                                this.stackPop();
                                this.codePtr += 2;
                                break;
                            case Pop.StackFrame:
                                this.stackFrameList.pop();
                                this.codePtr += 2;
                                break;
                        }
                        break;
                    case Opcode.Jump:
                        switch (cb.code[this.codePtr + 1]) {
                            case Jump.Unconditional:
                                this.codePtr = cb.code[this.codePtr + 2];
                                break;
                            case Jump.Equal:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a == b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                            case Jump.NotEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a != b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                            case Jump.Greater:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a > b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                            case Jump.GreaterOrEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a >= b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                            case Jump.Smaller:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a < b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                            case Jump.SmallerOrEqual:
                                b = this.stackPop();
                                a = this.stackPop();
                                if (a <= b)
                                    this.codePtr = cb.code[this.codePtr + 2];
                                else
                                    this.codePtr += 3;
                                break;
                        }
                        break;
                    case Opcode.Call:
                        switch (cb.code[this.codePtr + 1]) {
                            case Call.Native:
                                let info: FuncInfo = this.vmInst.nativeFuncMap.get(cb.code[this.codePtr + 2]);
                                let args: any = [];
                                for (let i = cb.code[this.codePtr + 3] - 1; i >= 0; i--) {
                                    args[i] = this.stackPop();
                                }
                                this.stackPush(info.func(args, this));
                                this.codePtr += 4;
                                break;
                            case Call.CodeBlock:
                                let cblock: CodeBlock = this.vmInst.cbMap.get(cb.code[this.codePtr + 2]);
                                this.stackFrameList.push(this.stack.length);
                                this.codePtrStack.push(this.codePtr);
                                this.execute(cblock);
                                this.codePtr = this.codePtrStack.pop();
                                a = this.stackFrameList.pop();
                                for (let i = this.stack.length-1; i >= a; i--) {
                                    this.stackPop();
                                }
                                for (let i = cblock.arguments.length - 1; i >= 0; i--) {
                                    this.stackPop();
                                }
                                //console.log('----- Execute CodeBlock #' + cb.name + ' -----');
                                this.codePtr += 4;
                                break;
                        }
                        break;
                    case Opcode.Assign:
                        switch (cb.code[this.codePtr + 1]) {
                            case Assign.Local:
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 3];
                                b = this.stackPop();
								this.stackSet(a, b, cb.code[this.codePtr + 2]);
                                this.codePtr += 4;
                                break;
                            case Assign.LocalArray:
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 3];
                                b = this.stackPop(); // value
                                c = this.stackPop(); // array index
								this.stackSetArray(a, c, b);
                                this.codePtr += 4;
                                break;
                            case Assign.LocalRecord:
                                let loop: number = cb.code[this.codePtr + 4];
                                a = this.stackFrameList[this.stackFrameList.length - 1] + cb.code[this.codePtr + 3];
                                b = this.stackPop(); // value
                                let record = this.stackGet(a);
                                let props = [];
                                for (let i = 0; i < loop; i++)
                                    props.push(this.stackPop());
                                for (let i = 0; i < loop; i++) {
                                    c = props.pop();
                                    if (i < loop - 1)
                                        record = record[c];
                                    else
                                        record[c] = b;
                                }
                                this.codePtr += 5;
                                break;
                        }
                        break;
                }
                count++;
                if (count > 10000) {
                    //setTimeout(() => worker(), 1);
                    //return;
                }
            }
        }
        worker();
    }

    trace(isAll) {
        console.log('--- TRACE ---');
        let start: number = 0;
        if (!isAll) {
            for (let i = this.stack.length - 1; i >= 0; i--) {
                if (this.symbols[i] == 'result') {
                    start = i;
                    break;
                }
            }
        }
        for (let i = start; i < this.stack.length; i++) {
			let v = this.stack[i];
			let s = this.symbols[i] == undefined ? '<unknown>' : this.symbols[i];
			console.log(s + ' : ' + v);
        } 
        console.log('-------------');
    }

    printCodeBlocks() {
        console.log('--- CodeBlocks ---');
        this.vmInst.cbMap.forEach((value: any, key: string) => {
            console.log(key);
        });
    }
}

// ----- Compiler -----

enum TokenType {
    EOL, Dot,
    Add, Sub, Mult, Div, Mod,
    Smaller, Greater, SmallerOrEqual, GreaterOrEqual, Equal, NotEqual,
    BracketOpen, BracketClose, SquareOpen, SquareClose, Negative, Number, String, Assign,
    Comma,
    Begin, End,
    When, Then, Else, While, Do, For, To, DownTo, Return,
    Break, Continue,
    FunctionDecl, Lambda,
    Function, Constant, Variable, Record,
    Unknown
}

let TokenName = [
    'end of line', '.',
    '+', '-', '*', '/', '%',
    '<', '>', '<=', '>=', '=', '<>',
    '(', ')', '[', ']', 'negative', 'number', 'string', 'assign',
    ',',
    '{', '}', 
    'when', 'then', 'else', 'while', 'do', 'for', 'to', 'downto', 'return',
    'break', 'continue',
    'function', '=>',
    'function', 'constant', 'variable', 'record',
    'unknown identifier'
]

class Token {
    value: string;
    kind: TokenType;
}

class Compiler {
    private source: string;
    private cb: CodeBlock;
    private lastToken: TokenType;
    private isDoingExpr: number;
    private vmInst: VirtualMachineInstance;
    private localVarMap: Map<string, IdentInfo>;
    private stackPtr: number;
    private breakSymbols: any[];
    private continueSymbols: any[];
    hints: any[];
    position: number;
    ln: number;
    col: number;

    constructor(vmInst: VirtualMachineInstance) {
        this.vmInst = vmInst;
        this.reset();
    }

    reset() {
        this.localVarMap = new Map<string, IdentInfo>(); 
        this.stackPtr = 0;
        this.ln = 1;
        this.col = 1;
        this.hints = [];
    }

    private inRange(s: string, a: number, b: number): boolean {
        var n: number = s.charCodeAt(0);
        if (n >= a && n <= b)
            return true;
        else
            return false;
    }

    private insert(src: string, s: string, i: number): string {
        if (i > 0)
            return src.substring(0, i) + s + src.substring(i, src.length);
        else
            return s + src;
    };

    private checkUnusedVariables() {
        for (let entry of Array.from(this.localVarMap.entries())) {
            let key: string = entry[0];
            let ident: IdentInfo = entry[1];
            if (!ident.isUsed && key != 'result') {
                this.hints.push(this.cb.name + ' [' + ident.ln + ',' + ident.col + ']: Variable "' + key + '" is declared but not used.');
            }
        }
    }

    private peekAtNextChar(): string {
        var pos: number = this.position + 1;
        if (pos < this.source.length)
            return this.source.charAt(pos);
        else
            return String.fromCharCode(0);
    }

    private nextChar(): string {
        this.position++;
        this.col++;
        let c: string = this.source.charAt(this.position);
        if (c == '\n') {
            this.ln++;
            this.col = 1;
        }
        if (this.position < this.source.length)
            return c;
        else
            return String.fromCharCode(0);
    }

    private Error(s) {
        throw new Error(this.cb.name + ' [' + this.ln +',' + this.col + ']: ' + s);
    }

    private parse(): Token {
        let c: string;
        let word: string;
        let result: Token = new Token();
        do {
            c = this.nextChar();
        } while (this.inRange(c, 1, 32) || c == ';');        
        switch (true) {
            case (c == '.'):
                result.kind = TokenType.Dot;
                break;
            case (c == '('):
                result.kind = TokenType.BracketOpen;
                break;
            case (c == ')'):
                result.kind = TokenType.BracketClose;
                break;
            case (c == '['):
                result.kind = TokenType.SquareOpen;
                break;
            case (c == ']'):
                result.kind = TokenType.SquareClose;
                break;
            case (c == '+'):
                result.kind = TokenType.Add;
                break;
            case (c == '-'):
                result.kind = TokenType.Sub;
				if (this.position > 0) {
					let p = this.position-1;
					let pc = this.source[p];
					let nc = this.source[p+2];
					if ((pc == " " || pc == "(" || pc == "=" || pc == ",") && (nc != " "))
						result.kind = TokenType.Negative;
				}
                break;
            case (c == '*'):
                result.kind = TokenType.Mult;
                break;
            case (c == '/'):
                if (this.peekAtNextChar() == '/') {
                    do {
                        this.nextChar();
                    } while (this.peekAtNextChar() != '\n' && this.peekAtNextChar().charCodeAt(0) != 0);
                    result = this.parse();
                } else
                    result.kind = TokenType.Div;
                break;
            case (c == '<'):
                if (this.peekAtNextChar() == '=') {
                    result.kind = TokenType.SmallerOrEqual;
                    this.nextChar();
                } else if (this.peekAtNextChar() == '>') {
                    result.kind = TokenType.NotEqual;
                    this.nextChar();
                } else
                    result.kind = TokenType.Smaller;
                break;
            case (c == '>'):
                if (this.peekAtNextChar() == '=') {
                    result.kind = TokenType.GreaterOrEqual;
                    this.nextChar();
                } else
                    result.kind = TokenType.Greater;
                break;
            case (c == '='):
                if (this.isDoingExpr > 0) {
                    result.kind = TokenType.Equal;
                } else {
                    if (this.peekAtNextChar() == '>') {
                        result.kind = TokenType.Lambda;
                        this.nextChar();
                    } else
                        result.kind = TokenType.Assign;
                }
                break;
            case (c == '%'):
                result.kind = TokenType.Mod;
                break;
            case (c == ','):
                result.kind = TokenType.Comma;
                break;
            case (c == '{'):
                result.kind = TokenType.Begin;
                break;
            case (c == '}'):
                result.kind = TokenType.End;
                break;
            case (c == '\''):
                result.kind = TokenType.String;
                let isDone: boolean = true;
                word = '';
                while (isDone) {
                    let c = this.nextChar();
                    switch (c.charCodeAt(0)) {
                        case 0:
                            this.position += 1;
                            this.Error('Unterminated string literal.');
                            break;
                        case '\''.charCodeAt(0):
                            if (this.peekAtNextChar() == '\'') {
                                this.nextChar();
                                word += c;
                            } else {
                                isDone = false;
                            }
                            break;
                        default:
                            word += c;
                            break;
                    }
                }
                result.value = word;
                break;
            case (this.inRange(c, '0'.charCodeAt(0), '9'.charCodeAt(0))):
                result.value = c;
                while (this.inRange(this.peekAtNextChar(), '0'.charCodeAt(0), '9'.charCodeAt(0)) || (this.peekAtNextChar() == '.')) {
                    let c = this.nextChar();
                    result.value += c;
                    if (c == '.') {
                        this.peekAtNextTokenExpected([TokenType.Number]);
                    }
                }
                result.kind = TokenType.Number;
                break;
            // Idents
            case (this.inRange(c, 'a'.charCodeAt(0), 'z'.charCodeAt(0)) ||
                  this.inRange(c, 'A'.charCodeAt(0), 'Z'.charCodeAt(0)) ||
                c == '_'):
                let oldPos: number = this.position+1;
                word = c;
                c = this.peekAtNextChar();
                while (this.inRange(c, 'a'.charCodeAt(0), 'z'.charCodeAt(0)) ||
                    this.inRange(c, 'A'.charCodeAt(0), 'Z'.charCodeAt(0)) || 
                    this.inRange(c, '0'.charCodeAt(0), '9'.charCodeAt(0)) ||
                    c == '_') {
                    word += this.nextChar();
                    c = this.peekAtNextChar();
                }
                word = word.toLowerCase();
                result.value = word;
                switch (word) {
                    case 'for':
                        result.kind = TokenType.For;
                        break;
                    case 'to':
                        result.kind = TokenType.To;
                        break;
                    case 'downto':
                        result.kind = TokenType.DownTo;
                        break;
                    case 'while':
                        result.kind = TokenType.While;
                        break;
                    case 'do':
                        result.kind = TokenType.Do;
                        break;
                    case 'when':
                        result.kind = TokenType.When;
                        break;
                    case 'then':
                        result.kind = TokenType.Then;
                        break;
                    case 'else':
                        result.kind = TokenType.Else;
                        break;
                    case 'break':
                        result.kind = TokenType.Break;
                        break;
                    case 'continue':
                        result.kind = TokenType.Continue;
                        break;
                    case 'return':
                        result.kind = TokenType.Return;
                        break;
                    case 'function':
                        result.kind = TokenType.FunctionDecl;
                        break;
                    default:
                        let funcInfo = this.vmInst.nativeFuncMap.get(word);
                        if (funcInfo != undefined) {
                            result.kind = TokenType.Function;
                            break;
                        }
                        let cb = this.vmInst.cbMap.get(word);
                        if (cb != undefined) {
                            result.kind = TokenType.Function;
                            break;
                        }
                        let c = this.vmInst.constMap.get(word);
                        if (c != undefined) {
                            result.kind = TokenType.Constant;
                            break;
                        }
                        let ident: IdentInfo = this.localVarMap.get(word);
                        if (ident != undefined) {
                            if (ident.kind == IdentType.Atom)
                                result.kind = TokenType.Variable;
                            else if (ident.kind == IdentType.Function)
                                result.kind = TokenType.Function;
                            break;
                        }
                        result.kind = TokenType.Unknown;
                        //throw new Error('[' + oldPos + '] Unknown identifier.');
                        break;
                }
                break;            
            case (c == String.fromCharCode(0)):
                result.kind = TokenType.EOL;
                break;
            default:
                result.kind = TokenType.Unknown;
                break;
        }
        return result;
    }

    private nextToken(): Token {
        return this.parse();
    }

    private peekAtNextToken(): Token {
        let oldPos: number = this.position;
        let oldCol: number = this.col;
        let oldLn: number = this.ln;
        let result: Token = this.parse();
        this.position = oldPos;
        this.col = oldCol;
        this.ln = oldLn;
        return result;
    }

    private tokenTypeString(tokens: TokenType[]): string {
        let result: string = '';
        for (let i = 0; i < tokens.length; i++) {
            result += '"' + TokenName[tokens[i]] + '"';
            if (i < tokens.length - 1)
                result += ' or ';
        }
        return result;
    }

    private checkToken(kind: Token, expected: TokenType[]): boolean {
        for (let i = 0; i < expected.length; i++) {
            if (token.kind == expected[i]) {
                return true;
            }
        }
        return false;
    }

    private nextTokenExpected(expected: TokenType[]): Token {
        let oldPos = this.position;
        let token = this.nextToken();
        for (let i = 0; i < expected.length; i++) {
            if (token.kind == expected[i]) {
                return token;
            }
        }
        this.position = oldPos;
        this.Error('Expected ' + this.tokenTypeString(expected) + ', got "' + TokenName[token.kind] + '" instead.');
    }

    private peekAtNextTokenExpected(expected: TokenType[]): Token {
        let token = this.peekAtNextToken();
        for (let i = 0; i < expected.length; i++) {
            if (token.kind == expected[i]) {
                return token;
            }
        }
        this.Error('Expected ' + this.tokenTypeString(expected) + ', got "' + TokenName[token.kind] + '" instead.');
    }

    private createNewIdent(kind: IdentType; addr: number): IdentInfo {
        let ident: IdentInfo = new IdentInfo();
        ident.addr = addr;
        ident.kind = kind;
        ident.isUsed = false;
        ident.col = this.col;
        ident.ln = this.ln;
        return ident;
    }

    private handleExpression() {
        this.isDoingExpr++;
        let exprStack: any[] = [];
        let isFuncCalled: boolean = false;

        let emitExpr = (opcode: Opcode, data?: any[]) => {
            exprStack.push(0);
            this.cb.emit(opcode, data);
        }

        let validateExpression = () => {
            if (exprStack.length == 0 && !isFuncCalled)
                this.Error('Invalid expression.')
        }

        let validateOperand = () => {
            /*
            let token = this.peekAtNextToken();
            switch (token.kind) {
                case TokenType.Number:
                case TokenType.Constant:
                case TokenType.String:
                case TokenType.Function:
                    throw new Error('[' + (this.position + 2) + '] Invalid expression.');
                    break;
            }*/
        }

        let tail = () => {
            switch (this.peekAtNextToken().kind) {
                case TokenType.Dot:
                    let count: number = 0;
                    let cont: boolean = true;
                    while (cont) {
                        token = this.peekAtNextToken();
                        switch (token.kind) {
                            case TokenType.Dot:
                                this.nextToken();
                                token = this.nextTokenExpected([TokenType.Constant, TokenType.Variable, TokenType.Function, TokenType.Unknown]);
                                emitExpr(Opcode.Push, [Push.Const, token.value]);
                                count++;
                                break;
                            default:
                                cont = false;
                                break;
                        }
                    }
                    emitExpr(Opcode.Push, [Push.LocalRecordPop, count]);
                    tail();
                    break;
                case TokenType.SquareOpen:
                    this.nextToken();
                    this.handleExpression();
                    this.nextTokenExpected([TokenType.SquareClose]);
                    emitExpr(Opcode.Push, [Push.LocalArrayPop]);
                    tail();
                    break;
            }
        }

        let factor = () => {
            while (true) {
                let token: Token = this.peekAtNextTokenExpected([TokenType.BracketOpen, TokenType.BracketClose, TokenType.Number, TokenType.EOL,
                    TokenType.Negative, TokenType.Function, TokenType.Constant, TokenType.Variable, TokenType.String
                );
                let c: any = 0;
                let ident: IdentInfo;
                switch (token.kind) {
                    case TokenType.BracketOpen:
                        isOperandLast = false;
                        this.nextToken();
                        this.peekAtNextTokenExpected([TokenType.Negative, TokenType.BracketOpen, TokenType.Number, TokenType.Constant, TokenType.Variable, TokenType.Function]);
                        logic();
                        this.nextTokenExpected([TokenType.BracketClose]);
                        validateOperand();
                        return;
                    case TokenType.Number:
                        this.nextToken();
                        validateOperand();
                        emitExpr(Opcode.Push, [Push.Const, Number(token.value)]);
                        return;
                    case TokenType.String:
                        this.nextToken();
                        validateOperand();
                        emitExpr(Opcode.Push, [Push.Const, token.value]);
                        return;
                    case TokenType.Constant:
                        this.nextToken();
                        validateOperand();
                        let c = this.vmInst.constMap.get(token.value);
                        emitExpr(Opcode.Push, [Push.Const, c]);
                        return;
                    case TokenType.Variable:
                        this.nextToken();
                        ident = this.localVarMap.get(token.value);
                        ident.isUsed = true;
                        switch (this.peekAtNextToken().kind) {
                            case TokenType.SquareOpen:
                                this.nextToken();
                                this.handleExpression();
                                this.nextTokenExpected([TokenType.SquareClose]);
                                emitExpr(Opcode.Push, [Push.LocalArray, ident.addr]);
                                tail();
                                break;
                            case TokenType.Dot:
                                let count: number = 0;
                                let cont: boolean = true;
                                while (cont) {
                                    token = this.peekAtNextToken();
                                    switch (token.kind) {
                                        case TokenType.Dot:
                                            this.nextToken();
                                            token = this.nextTokenExpected([TokenType.Constant, TokenType.Variable, TokenType.Function, TokenType.Unknown]);
                                            emitExpr(Opcode.Push, [Push.Const, token.value]);
                                            count++;
                                            break;
                                        default:
                                            cont = false;
                                            break;
                                    }
                                }
                                emitExpr(Opcode.Push, [Push.LocalRecord, ident.addr, count]);
                                tail();
                                break;
                            default:
                                validateOperand();
                                emitExpr(Opcode.Push, [Push.LocalVar, ident.addr]);
                                break;
                        }
                        return;
                    case TokenType.Function:
                        this.nextToken();
                        isFuncCalled = true;
                        this.handleFuncCall(token.value);
                        tail();
                        validateOperand();
                        return;
                    default:
                        return;
                }
            }
        }

        let signedFactor = () => {
            factor();
            while (true) {
                let token: Token = this.peekAtNextToken();
                switch (token.kind) {
                    case TokenType.Negative:
                        this.nextToken();
                        this.peekAtNextTokenExpected([TokenType.BracketOpen, TokenType.Number, TokenType.Constant, TokenType.Variable]);
                        token.kind = TokenType.Negative;
                        factor();
                        emitExpr(Opcode.Operator, [Operator.Negative]);
                        break;
                    default:
                        return;
                }
            }
        }
        
        let binaryOp = (op: Operator, func: any, isString?: boolean) => {
            this.nextToken();
            if (isString == undefined)
                this.peekAtNextTokenExpected([TokenType.BracketOpen, TokenType.Number, TokenType.Negative, TokenType.Function, TokenType.Constant, TokenType.Variable]);
            else
                this.peekAtNextTokenExpected([TokenType.BracketOpen, TokenType.Number, TokenType.Negative, TokenType.String, TokenType.Function, TokenType.Constant, TokenType.Variable]);
            func();
            emitExpr(Opcode.Operator, [op]);
        }

        let term = () => {
            signedFactor();
            while (true) {
                let token: Token = this.peekAtNextToken();
                switch (token.kind) {
                    case TokenType.Mult:
                        binaryOp(Operator.Mult, signedFactor);
                        break;
                    case TokenType.Div:
                        binaryOp(Operator.Div, signedFactor);
                        break;
                    case TokenType.Mod:
                        binaryOp(Operator.Mod, signedFactor);
                        break;
                    default:
                        return;
                }
            }
        }

        let expr = () => {
            term();
            while (true) {
                let token: Token = this.peekAtNextToken();
                switch (token.kind) {
                    case TokenType.Add:
                        binaryOp(Operator.Add, term, true);
                        break;
                    case TokenType.Sub:
                        binaryOp(Operator.Sub, term);
                        break;
                    default:
                        return;
                }
            }
        }

        let logic = () => {
            expr();
            while (true) {
                let token: Token = this.peekAtNextToken();
                switch (token.kind) {
                    case TokenType.Smaller:
                        binaryOp(Operator.Smaller, expr, true);
                        break;
                    case TokenType.SmallerOrEqual:
                        binaryOp(Operator.SmallerOrEqual, expr, true);
                        break;
                    case TokenType.Greater:
                        binaryOp(Operator.Greater, expr, true);
                        break;
                    case TokenType.GreaterOrEqual:
                        binaryOp(Operator.GreaterOrEqual, expr, true);
                        break;
                    case TokenType.Equal:
                        binaryOp(Operator.Equal, expr, true);
                        break;
                    case TokenType.NotEqual:
                        binaryOp(Operator.NotEqual, expr, true);
                        break;
                    default:
                        return;
                }
            }
        }

        logic();
        validateExpression();
        this.isDoingExpr--;
    }

    private handleWhen() {
		// Block addresses
        let startBlock1: number;
        let startBlock2: number;
        let endBlock2: number;
		// Compare addresses
        let jumpBlock1: number;
        let jumpBlock2: number;
        let jumpEnd: number;

        this.handleExpression();

        this.cb.emit(Opcode.Push, [Push.Const, true]);
        jumpBlock1 = this.cb.emit(Opcode.Jump, [Jump.Equal, 0]);
        jumpBlock2 = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);

        startBlock1 = this.cb.getCurrentAddr();

        this.nextTokenExpected([TokenType.Then]);
        this.handleBlock();
        
        jumpEnd = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);
        startBlock2 = this.cb.getCurrentAddr();
        
        if (this.peekAtNextToken().kind == TokenType.Else) {
            this.nextToken();
            this.handleBlock();
        }

        endBlock2 = this.cb.getCurrentAddr();

        // Patch addresses
        this.cb.patch(jumpBlock1 - 1, startBlock1);
        this.cb.patch(jumpBlock2 - 1, startBlock2);
        this.cb.patch(jumpEnd - 1, endBlock2);
    }

    private handleWhile() {
		// Block addresses
        let startBlock: number;
        let endBlock: number;
		// Compare addresses
        let jumpBlock: number;
        let jumpEnd: number;

        this.continueSymbols.push([]);
        this.breakSymbols.push([]);

        startBlock = this.cb.getCurrentAddr();
        this.handleExpression();

        this.cb.emit(Opcode.Push, [Push.Const, false]);
        jumpEnd = this.cb.emit(Opcode.Jump, [Jump.Equal, 0]); 

        this.handleBlock();

        jumpBlock = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);
        endBlock = this.cb.getCurrentAddr();

        // Patch symbol table
        let continueTable: any[] = this.continueSymbols.pop();
        let breakTable: any[] = this.breakSymbols.pop();
        for (let i = 0; i < continueTable.length; i++)
            this.cb.patch(continueTable[i], startBlock);
        for (let i = 0; i < breakTable.length; i++)
            this.cb.patch(breakTable[i], endBlock);

        // Patch addresses
        this.cb.patch(jumpBlock - 1, startBlock);
        this.cb.patch(jumpEnd - 1, endBlock);
    }

    private handleFor() {
		// Block addresses
        let startBlock: number;
        let endBlock: number;
		// Compare addresses
        let jumpBlock: number;
        let jumpEnd: number;

        this.continueSymbols.push([]);
        this.breakSymbols.push([]);

        let token: TokenType;
        // Assign
        token = this.nextTokenExpected([TokenType.Variable, TokenType.Unknown]);
        switch (token.kind) {
            case TokenType.Unknown:       
                this.localVarMap.set(token.value, this.createNewIdent(IdentType.Atom, this.stackPtr));
                this.stackPtr++;
                break;
        }
        let varName: string = token.value;
        let ident: IdentInfo = this.localVarMap.get(varName);
        let varAddr: number = ident.addr;
        ident.isUsed = true;
        this.nextTokenExpected([TokenType.Assign]);
        this.handleExpression();
        this.cb.emit(Opcode.Assign, [Assign.Local, varName, varAddr]);

        // To or Downto
        token = this.nextTokenExpected([TokenType.To, TokenType.DownTo]); 
        let direction: TokenType = token.kind;  

        startBlock = this.cb.getCurrentAddr();
        // Where 
        this.cb.emit(Opcode.Push, [Push.LocalVar, varAddr]);
        this.handleExpression();
        switch (direction) {
            case TokenType.To:
                jumpEnd = this.cb.emit(Opcode.Jump, [Jump.Greater, 0]);
                break;
            case TokenType.DownTo:
                jumpEnd = this.cb.emit(Opcode.Jump, [Jump.Smaller, 0]);
                break;
        }

        this.handleBlock();

        let contBlock: number = this.cb.getCurrentAddr();

        // Direction
        this.cb.emit(Opcode.Push, [Push.LocalVar, varAddr]);
        switch (direction) {
            case TokenType.To:
                this.cb.emit(Opcode.Operator, [Operator.Inc]);
                break;
            case TokenType.DownTo:
                this.cb.emit(Opcode.Operator, [Operator.Dec]);
                break;
        }
        this.cb.emit(Opcode.Assign, [Assign.Local, varName, varAddr]);
        jumpBlock = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);
        endBlock = jumpBlock;

        // Patch symbol table
        let continueTable: any[] = this.continueSymbols.pop();
        let breakTable: any[] = this.breakSymbols.pop();
        for (let i = 0; i < continueTable.length; i++)
            this.cb.patch(continueTable[i], contBlock);
        for (let i = 0; i < breakTable.length; i++)
            this.cb.patch(breakTable[i], endBlock);

        // Patch addresses
        this.cb.patch(jumpBlock - 1, startBlock);
        this.cb.patch(jumpEnd - 1, endBlock);
    }

    private handleFuncDecl(name: string) {
        let compiler: Compiler = new Compiler(this.vmInst);
        let arguments: any[] = [];
        compiler.stackPtr = 0;

        this.nextTokenExpected([TokenType.BracketOpen]);
        let token: TokenType = this.peekAtNextToken();
        while (token.kind != TokenType.BracketClose) {
            let exit: boolean = false;
            switch (token.kind) {
                case TokenType.Unknown:
                    this.nextToken();
                    arguments.push(token.value);
                    if (this.peekAtNextToken().kind == TokenType.Comma) {
                        this.nextToken();
                        token = this.peekAtNextTokenExpected([TokenType.Unknown]);
                    } else 
                        token = this.peekAtNextToken();
                    break;
                default:
                    exit = true;
                    break;
            }
            if (exit) break;
        }
        for (let i = arguments.length - 1; i >= 0; i--) {
            let ident: IdentInfo = this.createNewIdent(IdentType.Atom, -i - 1);
            ident.isUsed = true;
            compiler.localVarMap.set(arguments[arguments.length - 1 - i], ident);
        }
        compiler.localVarMap.set('result', this.createNewIdent(IdentType.Atom, -arguments.length-1));

        this.nextTokenExpected([TokenType.BracketClose]);
        compiler.ln = this.ln;
        compiler.col = this.col;
        let cb: CodeBlock = compiler.compile(name, this.source, this.position, arguments);
        for (let i = 0; i < compiler.hints.length; i++) {
            this.hints.push(compiler.hints[i]);
        }

        this.position = compiler.position;
        this.ln = compiler.ln;
        this.col = compiler.col;
        //console.log('----- Virtual Machine code #' + this.cb.name + ' -----');
    }

    private handleFuncCall(name: string) {
        let info: FuncInfo = this.vmInst.nativeFuncMap.get(name);
        let cb: CodeBlock = this.vmInst.cbMap.get(name);
        let argCount: number = 0;
        let argCountDecl: number = 0;
        if (info != undefined)
            argCountDecl = info.argCount;
        else {
            this.cb.emit(Opcode.Push, [Push.Const, 0]);
            this.cb.emit(Opcode.Push, [Push.Symbol, 'result']);
            argCountDecl = cb.arguments.length;
        }
        this.nextTokenExpected([TokenType.BracketOpen]);
        if (argCountDecl >= 0) {
            for (let i = 0; i < argCountDecl; i++) {
                argCount++;
                this.handleExpression();
                if (info == undefined)
                    this.cb.emit(Opcode.Push, [Push.Symbol, cb.arguments[i]]);
                if (i < argCountDecl - 1) {
                    this.nextTokenExpected([TokenType.Comma]);
                }
            }
        } else {
            if (this.peekAtNextToken().kind != TokenType.BracketClose) {
                do {
                    if (argCount > 0)
                        this.nextToken();
                    argCount++;
                    this.handleExpression();
                } while (this.peekAtNextToken().kind == TokenType.Comma);
            }
        }
        this.nextTokenExpected([TokenType.BracketClose]);
        if (info != undefined)
            this.cb.emit(Opcode.Call, [Call.Native, name, argCount]);
        else {            
            this.cb.emit(Opcode.Call, [Call.CodeBlock, name, argCount]);
        }
    }

    private handleFormulaBlock() {
        let token = this.peekAtNextToken();
        this.handleExpression();
    }

    private handleArrayAssign(): boolean {
        let result: boolean = false;
        let token: Token = this.peekAtNextToken();
        switch (token.kind) {
            case TokenType.SquareOpen:
                this.nextToken();
                this.handleExpression();
                this.nextTokenExpected([TokenType.SquareClose]);
                result = true;
                break;
        }
        return result;
    }

    private handleRecordAssign(): number {
        let result: number = 0;
        let cont: boolean = true;
        while (cont) {
            let token: Token = this.peekAtNextToken();
            switch (token.kind) {
                case TokenType.Dot:
                    this.nextToken();
                    token = this.nextTokenExpected([TokenType.Constant, TokenType.Variable, TokenType.Function, TokenType.Unknown]);
                    this.cb.emit(Opcode.Push, [Push.Const, token.value]);
                    result++;
                    break;
                default:
                    cont = false;
                    break;
            }
        }
        return result;
    }

    private handleVarAssign(isUnknown: boolean; token: Token) {
        let varName: string = token.value;
        let varAddr: number = this.localVarMap.get(varName).addr;

        let isArrayAssign: boolean;
        let recordAssign: number = 0;
        isArrayAssign = this.handleArrayAssign();
        if (!isArrayAssign)
            recordAssign = this.handleRecordAssign();
        token = this.peekAtNextTokenExpected([TokenType.Assign, TokenType.Lambda]);
        if (!isUnknown && (this.peekAtNextToken().kind == TokenType.FunctionDecl || token.kind == TokenType.Lambda)) {
            this.Error('Invalid expression.');
        } 
        if (token.kind == TokenType.Assign) {
            this.nextToken();
            token = this.peekAtNextToken();
        }
        switch (token.kind) {
            case TokenType.FunctionDecl:
            case TokenType.Lambda:
                this.localVarMap.delete(varName);
                this.stackPtr--;        
                this.nextToken();    
                this.handleFuncDecl(varName);
                return;
            case TokenType.SquareOpen:     
                this.nextToken();        
                this.nextTokenExpected([TokenType.SquareClose]);  
                this.cb.emit(Opcode.Push, [Push.Const, []]);
                break;
            case TokenType.Begin:     
                this.nextToken();        
                this.nextTokenExpected([TokenType.End]);  
                this.cb.emit(Opcode.Push, [Push.Const, {}]);
                break;
            default:
                this.handleExpression();
                break;
        }
        if (isArrayAssign)
            this.cb.emit(Opcode.Assign, [Assign.LocalArray, varName, varAddr]);
        else if (recordAssign > 0)
            this.cb.emit(Opcode.Assign, [Assign.LocalRecord, varName, varAddr, recordAssign]);
        else
            this.cb.emit(Opcode.Assign, [Assign.Local, varName, varAddr]);
    }

    private handleBlock() {
        let token: Token = this.peekAtNextToken();
        let isUnknown: booean = false;
        let ident: IdentInfo;
        let a: number;
        switch (token.kind) {
            case TokenType.While:
                this.nextToken();
                this.handleWhile();
                break;
            case TokenType.For:
                this.nextToken();
                this.handleFor();
                break;
            case TokenType.When:
                this.nextToken();
                this.handleWhen();
                break;
            case TokenType.Begin:
                this.nextToken();
                token = this.peekAtNextToken();
                while (token.kind != TokenType.End) {
                    if (token.kind == TokenType.EOL) {
                        throw new Error('[' + (this.position + 2) + '] Expected "end", got "end of line" instead.');
                    } 
                    this.handleBlock();                    
                    token = this.peekAtNextToken();
                }
                this.nextToken();
                break;
            case TokenType.Unknown:
                this.nextToken();
                this.localVarMap.set(token.value, this.createNewIdent(IdentType.Atom, this.stackPtr));
                this.stackPtr++;
                this.handleVarAssign(true, token)
                break;           
            case TokenType.Variable:
                this.nextToken();
                this.handleVarAssign(false, token);
                break;          
            case TokenType.Function:
                this.nextToken();
                this.handleFuncCall(token.value);
                this.cb.emit(Opcode.Pop, [Pop.Const]);
                break;
            case TokenType.Return:
                this.nextToken();
                this.cb.emit(Opcode.Return);
                return;
            case TokenType.Break:
                this.nextToken();
                if (this.breakSymbols.length == 0) {
                    this.Error('Not in loop but "break" found.');
                } else {
                    a = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);
                    this.breakSymbols[this.breakSymbols.length - 1].push(a-1);                    
                }
                break;
            case TokenType.Continue:
                this.nextToken();
                if (this.continueSymbols.length == 0) {
                    this.Error('Not in loop but "continue" found.');
                } else {
                    a = this.cb.emit(Opcode.Jump, [Jump.Unconditional, 0]);
                    this.continueSymbols[this.continueSymbols.length - 1].push(a-1);
                }
                break;
            case TokenType.EOL:
                return;
            default:
                this.Error('Invalid statement.');
                break;
        }
    }

    private handleStartBlock(name: string) {
        let token = this.peekAtNextToken();
        switch (token.kind) {
            case TokenType.Assign:
                this.nextToken();
                this.handleFormulaBlock();                
                this.cb.emit(Opcode.Assign, [Assign.Local, 'result', this.localVarMap.get('result').addr]);
                break;
            case TokenType.EOL:
                break;
            default:
                if (name == 'main') {
                    while (token.kind != TokenType.EOL) {
                        this.handleBlock();
                        token = this.peekAtNextToken();
                    }
                } else {
                    token = this.nextTokenExpected([TokenType.Begin]);              
                    token = this.peekAtNextToken();
                    while (token.kind != TokenType.End) {
                        if (token.kind == TokenType.EOL) {
                            this.Error('Expected "end", got "end of line" instead.');
                        } 
                        this.handleBlock();                    
                        token = this.peekAtNextToken();
                    }
                    this.nextToken();
                }
                break;
        }
    }

    private codeGenerator(name: string, arguments: any[] = null) {
        //console.log('----- Virtual Machine code #' + name + ' -----');
        this.cb = this.vmInst.registerCodeBlock(name);
        if (arguments != null)
            this.cb.arguments = arguments;
        this.cb.emit(Opcode.Push, [Push.StackFrame]);
		this.handleStartBlock(name);
        this.cb.emit(Opcode.Pop, [Pop.StackFrame]);
    }

    // Parser: LL(1)
    compile(name: string, src: string, pos: number = -1, arguments: any[] = null): CodeBlock {
        this.source = src;
        this.position = pos;
        this.isDoingExpr = 0;
        this.breakSymbols = [];
        this.continueSymbols = [];
        let isResult: boolean = false;
        
        if (this.localVarMap.get('result') == undefined) {
            if (arguments != null) {
                this.localVarMap.set('result', this.createNewIdent(IdentType.Atom, -arguments.length-1));
                for (let i = arguments.length - 1; i >= 0; i--) {
                    this.localVarMap.set(arguments[arguments.length - 1 - i], this.createNewIdent(IdentType.Atom, -i - 1));
                }
            } else {                
                this.localVarMap.set('result', this.createNewIdent(IdentType.Atom, -1));
            }
        }

        this.codeGenerator(name, arguments);
        this.checkUnusedVariables();
        return this.vmInst.cbMap.get(name);
    }
}

/// ----- MAIN -----

document.body.innerHTML = `
<div style="text-align: center">
    <br/>
    <br/>
    <br/>
    <br/>
    <button onclick=exec()>Execute!</button>
    <br/>
    <textarea id="expr" rows="20" cols="80">print('NepNep!')</textarea>
    <br/>
    <a id="out"></a>
    <br/>
</div>
`;
let exprNode = document.getElementById('expr');
let outNode = document.getElementById('out');

let vmInst: VirtualMachineInstance = new VirtualMachineInstance();
let compiler: Compiler = new Compiler(vmInst);
let vm: VirtualMachine = new VirtualMachine(vmInst);
let cb: CodeBlock;
let runable: boolean = false;

vmInst.registerConstant('PI', Math.PI);
vmInst.registerConstant('TRUE', true);
vmInst.registerConstant('FALSE', false);
vmInst.registerFunction('today', 0, (args) => {
    let today: Date = new Date();
    return today.toISOString().substring(0, 10);
});
vmInst.registerFunction('trace', 1, (args) => {
    vm.trace(args[0]);
    return 0;
});
vmInst.registerFunction('array', -1, (args) => {
    let a: any = [];
    for (let i = 0; i < args.length; i++)
        a[i] = args[i];
    return a;
});
vmInst.registerFunction('record', -1, (args) => {
    let a: any = {};
    for (let i = 0; i < args.length; i+=2)
        a[args[i]] = args[i+1];
    return a;
});
vmInst.registerFunction('json_parse', 1, (args) => {
    return JSON.parse(args[0]);
});
vmInst.registerFunction('json_stringify', 1, (args) => {
    return JSON.stringify(args[0]);
});
vmInst.registerFunction('http_get', 1, (args) => {
    let result: any = {};
    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.open('GET', args[0], false);
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            result.response = xhttp.responseText; 
        }
        result.status = xhttp.status;
    }
    xhttp.send();
    return result;
});
vmInst.registerFunction('alert', 1, (args) => {
    alert(args[0]);
    return 0;
});
vmInst.registerFunction('print', 1, (args) => {
    console.log(args[0]);
    return 0;
});
vmInst.registerFunction('prompt', 1, (args) => {
    return prompt(args[0]);
});
vmInst.registerFunction('length', 1, (args) => {
    return args[0].length;
});
vmInst.registerFunction('if', 3, (args) => {
    return args[0] == true ? args[1] : args[2];
});
vmInst.registerFunction('sin', 1, (args) => {
    return Math.sin(args[0]);
});
vmInst.registerFunction('cos', 1, (args) => {
    return Math.sin(args[0]);
});
vmInst.registerFunction('bitand', 2, (args) => {
    return args[0] & args[1];
});
vmInst.registerFunction('bitor', 2, (args) => {
    return args[0] | args[1];
});
vmInst.registerFunction('bitxor', 2, (args) => {
    return args[0] ^ args[1];
});
vmInst.registerFunction('bitnot', 1, (args) => {
    return !args[0];
});
vmInst.registerFunction('sum', -1, (args) => {
    if (args.length > 0) {
        let result = args[0];
        for (let i = 1; i < args.length; i++)
            result += args[i];
        return result;
    } 
    return 0;
});

let main = () => {
    let result: string = '';
    try {
        console.clear();
        vmInst.cbMap.clear();
        compiler.reset();
        let timeStart: number = Date.now();
        cb = compiler.compile('main', (<HTMLInputElement>exprNode).value);
        let compileTime: number = Date.now() - timeStart;
        vm.reset();
        //vm.printCodeBlocks();
        timeStart: number = Date.now();

        let runTime: number = Date.now() - timeStart;
        console.log('------ Compile time: ' + (compileTime/1000) + 's -----');

        for (let i = 0; i < compiler.hints.length; i++) {
            result += '<a style="color: blue">Hint: ' + compiler.hints[i] + '</a></br>';
        }
        runable = true;
        //if (vm.getResult() != undefined)
        //    result = '<a style="color: green">Result: ' + String(vm.getResult()) + '</a>';
    } catch (e) {
        result += '<a style="color: red">' + e + '</a>';
        runable = false;
    }
    outNode.innerHTML = result;
};

let exec = () => {
    let result: string = '';
    if (!runable) return;
    try {
        let timeStart: number = Date.now();
        vm.reset();
        vm.execute(cb);
        let runTime: number = Date.now() - timeStart;
        console.log('------ Execution time: ' + (runTime / 1000) + 's -----');
        vm.trace();
    } catch (e) {
        result += '<a style="color: red">' + e + '</a>';
        runable = false;
    }
    outNode.innerHTML += result;
}

exprNode.onkeyup = main;
main();
