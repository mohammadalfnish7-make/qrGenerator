/**
 * Self-contained QR Code Matrix Engine and Advanced Canvas/SVG Renderer.
 * Supports:
 * - Standard QR Code specification (Versions 1-40, ECC Levels L, M, Q, H)
 * - Complete UTF-8 Byte mode encoding
 * - Custom dot styling (square, rounded, dots, classy)
 * - Custom finder/corner styles (square, rounded, circle)
 * - Solid colors, linear & radial gradients
 * - Center logo embedding with custom shape masks (circle, rounded squircle, square),
 *   background badge, border, and automatic error-correction escalation (Level H)
 * - High-DPI canvas export (PNG) and vector SVG generation
 */

(function (global) {
  'use strict';

  // ==========================================
  // 1. QR Code Matrix Math & Generation Engine
  // ==========================================

  const QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };
  const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  const QRMaskPattern = {
    PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3,
    PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7
  };

  const QRMath = {
    glog: function (n) {
      if (n < 1) throw new Error("glog(" + n + ")");
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 255) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };

  for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

  function QRPolynomial(num, shift) {
    if (num.length === undefined) throw new Error(num.length + "/" + shift);
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
  }

  QRPolynomial.prototype = {
    get: function (index) { return this.num[index]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (let i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  QRRSBlock.RS_BLOCK_TABLE = [
    // 1
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    // 2
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    // 3
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    // 4
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    // 5
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    // 7
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16]
  ];

  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock === undefined) {
      throw new Error("Bad RS block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };

  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return undefined;
    }
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }

  QRBitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    getLengthInBits: function () { return this.length; },
    putBit: function (bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
    this.parsedData = [];
    // UTF-8 encode
    for (let i = 0, l = this.data.length; i < l; i++) {
      const byteArray = [];
      const code = this.data.charCodeAt(i);
      if (code > 0x10000) {
        byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
        byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
        byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
        byteArray[3] = 0x80 | (code & 0x3F);
      } else if (code > 0x800) {
        byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
        byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
        byteArray[2] = 0x80 | (code & 0x3F);
      } else if (code > 0x80) {
        byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
        byteArray[1] = 0x80 | (code & 0x3F);
      } else {
        byteArray[0] = code;
      }
      this.parsedData.push(byteArray);
    }
    this.parsedData = Array.prototype.concat.apply([], this.parsedData);
    if (this.parsedData.length !== this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }

  QR8bitByte.prototype = {
    getLength: function () { return this.parsedData.length; },
    write: function (buffer) {
      for (let i = 0; i < this.parsedData.length; i++) {
        buffer.put(this.parsedData[i], 8);
      }
    }
  };

  const QRUtil = {
    PATTERN_POSITION_TABLE: [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90]
    ],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      let d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data) {
      let d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
      }
      return (data << 12) | d;
    },
    getBCHDigit: function (data) {
      let digit = 0;
      while (data !== 0) { digit++; data >>>= 1; }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001: return i % 2 === 0;
        case QRMaskPattern.PATTERN010: return j % 3 === 0;
        case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case QRMaskPattern.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
        default: throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      let a = new QRPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER: return 10;
          case QRMode.MODE_ALPHA_NUM: return 9;
          case QRMode.MODE_8BIT_BYTE: return 8;
          case QRMode.MODE_KANJI: return 8;
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER: return 12;
          case QRMode.MODE_ALPHA_NUM: return 11;
          case QRMode.MODE_8BIT_BYTE: return 16;
          case QRMode.MODE_KANJI: return 10;
        }
      } else {
        switch (mode) {
          case QRMode.MODE_NUMBER: return 14;
          case QRMode.MODE_ALPHA_NUM: return 13;
          case QRMode.MODE_8BIT_BYTE: return 16;
          case QRMode.MODE_KANJI: return 12;
        }
      }
      return 8;
    },
    getLostPoint: function (qrCode) {
      const moduleCount = qrCode.getModuleCount();
      let lostPoint = 0;
      // Level 1
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          let sameCount = 0;
          const dark = qrCode.isDark(row, col);
          for (let r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (let c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += (3 + sameCount - 5);
        }
      }
      // Level 2
      for (let row = 0; row < moduleCount - 1; row++) {
        for (let col = 0; col < moduleCount - 1; col++) {
          let count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) lostPoint += 3;
        }
      }
      // Level 3
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col) &&
            !qrCode.isDark(row, col + 1) &&
            qrCode.isDark(row, col + 2) &&
            qrCode.isDark(row, col + 3) &&
            qrCode.isDark(row, col + 4) &&
            !qrCode.isDark(row, col + 5) &&
            qrCode.isDark(row, col + 6)) {
            lostPoint += 40;
          }
        }
      }
      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col) &&
            !qrCode.isDark(row + 1, col) &&
            qrCode.isDark(row + 2, col) &&
            qrCode.isDark(row + 3, col) &&
            qrCode.isDark(row + 4, col) &&
            !qrCode.isDark(row + 5, col) &&
            qrCode.isDark(row + 6, col)) {
            lostPoint += 40;
          }
        }
      }
      // Level 4
      let darkCount = 0;
      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col)) darkCount++;
        }
      }
      const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function (data) {
      this.dataList.push(new QR8bitByte(data));
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        return false;
      }
      return this.modules[row][col];
    },
    getModuleCount: function () { return this.moduleCount; },
    make: function () {
      if (this.typeNumber < 1) {
        let typeNumber = 1;
        for (; typeNumber < 20; typeNumber++) {
          const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
          const buffer = new QRBitBuffer();
          let totalDataCount = 0;
          for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          for (let i = 0; i < this.dataList.length; i++) {
            const data = this.dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
            data.write(buffer);
          }
          if (buffer.getLengthInBits() <= totalDataCount * 8) break;
        }
        this.typeNumber = typeNumber;
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (let col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      if (this.dataCache == null) {
        this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      }
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      let minLostPoint = 0;
      let pattern = 0;
      for (let i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        const lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    setupTimingPattern: function () {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = (r % 2 === 0);
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = (c % 2 === 0);
      }
    },
    setupPositionAdjustPattern: function () {
      const pos = QRUtil.getPatternPosition(this.typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i];
          const col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
      }
      for (let i = 0; i < 18; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      const data = (this.errorCorrectLevel << 3) | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              }
              const mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
  };

  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error("Code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + "bit)");
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xEC, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };

  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) data[index++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) data[index++] = ecdata[r][i];
      }
    }
    return data;
  };

  // ==========================================
  // 2. High-Precision QR Canvas & SVG Renderer
  // ==========================================

  const QREngine = {
    /**
     * Generate QR Matrix and render to HTML5 Canvas
     * @param {HTMLCanvasElement} canvas
     * @param {Object} options
     */
    render: function (canvas, options) {
      const opts = Object.assign({
        text: "https://example.com",
        size: 1024,
        margin: 3,
        dotStyle: "rounded", // 'square', 'rounded', 'dots', 'classy'
        cornerStyle: "rounded", // 'square', 'rounded', 'circle'
        fgColor: "#0f172a",
        fgColorEnd: "#3b82f6",
        gradientType: "linear-diagonal", // 'none', 'linear-diagonal', 'linear-horizontal', 'linear-vertical', 'radial'
        bgColor: "#ffffff",
        cornerColor: null, // finder patterns custom color (null to match fgColor)
        logo: null // { image, size: 0.22, padding: 8, badgeShape: 'rounded', badgeBg: '#ffffff', badgeBorder: 3, badgeBorderColor: '#e2e8f0', shadow: true }
      }, options || {});

      // If logo is present, ALWAYS enforce High Error Correction Level (Level H = ~30% recovery)
      const eccLevel = (opts.logo && opts.logo.image) ? QRErrorCorrectLevel.H : (opts.ecc || QRErrorCorrectLevel.M);

      // Generate QR Code Matrix
      const qr = new QRCodeModel(0, eccLevel);
      qr.addData(opts.text || "https://example.com");
      qr.make();

      const moduleCount = qr.getModuleCount();
      const canvasSize = opts.size || 1024;
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Background
      if (opts.bgColor && opts.bgColor !== "transparent") {
        ctx.fillStyle = opts.bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
      }

      const totalModules = moduleCount + opts.margin * 2;
      const cellSize = canvasSize / totalModules;
      const marginPx = opts.margin * cellSize;

      // Create Foreground Style (Solid or Gradient)
      let fgStyle = opts.fgColor;
      if (opts.gradientType !== "none" && opts.fgColorEnd && opts.fgColorEnd !== opts.fgColor) {
        let grad;
        if (opts.gradientType === "linear-horizontal") {
          grad = ctx.createLinearGradient(marginPx, 0, canvasSize - marginPx, 0);
        } else if (opts.gradientType === "linear-vertical") {
          grad = ctx.createLinearGradient(0, marginPx, 0, canvasSize - marginPx);
        } else if (opts.gradientType === "radial") {
          grad = ctx.createRadialGradient(canvasSize / 2, canvasSize / 2, cellSize * 2, canvasSize / 2, canvasSize / 2, canvasSize / 1.5);
        } else {
          // linear-diagonal
          grad = ctx.createLinearGradient(marginPx, marginPx, canvasSize - marginPx, canvasSize - marginPx);
        }
        grad.addColorStop(0, opts.fgColor);
        grad.addColorStop(1, opts.fgColorEnd);
        fgStyle = grad;
      }

      // Check if coordinate is inside finder patterns
      function isFinder(row, col) {
        if (row < 7 && col < 7) return true; // Top-left
        if (row < 7 && col >= moduleCount - 7) return true; // Top-right
        if (row >= moduleCount - 7 && col < 7) return true; // Bottom-left
        return false;
      }

      // Calculate center logo bounds in module coordinates
      let logoArea = null;
      if (opts.logo && opts.logo.image) {
        const logoRatio = Math.min(Math.max(opts.logo.size || 0.22, 0.12), 0.32);
        const logoModCount = Math.floor(moduleCount * logoRatio);
        const centerStart = Math.floor((moduleCount - logoModCount) / 2);
        const centerEnd = centerStart + logoModCount;
        logoArea = { start: centerStart, end: centerEnd };
      }

      // Helper function to check if module is cleared by logo
      function isUnderLogo(row, col) {
        if (!logoArea) return false;
        return (row >= logoArea.start && row < logoArea.end && col >= logoArea.start && col < logoArea.end);
      }

      // 1. Draw Body Modules (excluding Finders and Logo Area)
      ctx.fillStyle = fgStyle;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinder(r, c)) continue;
          if (isUnderLogo(r, c)) continue;
          if (!qr.isDark(r, c)) continue;

          const x = marginPx + c * cellSize;
          const y = marginPx + r * cellSize;

          drawModule(ctx, x, y, cellSize, opts.dotStyle);
        }
      }

      // 2. Draw 3 Corner Finder Patterns
      const finderColor = opts.cornerColor || fgStyle;
      drawFinder(ctx, marginPx, marginPx, cellSize, opts.cornerStyle, finderColor, opts.bgColor);
      drawFinder(ctx, marginPx + (moduleCount - 7) * cellSize, marginPx, cellSize, opts.cornerStyle, finderColor, opts.bgColor);
      drawFinder(ctx, marginPx, marginPx + (moduleCount - 7) * cellSize, cellSize, opts.cornerStyle, finderColor, opts.bgColor);

      // 3. Draw Center Logo & Badge
      if (opts.logo && opts.logo.image) {
        drawLogoBadge(ctx, canvasSize, opts.logo);
      }

      return qr;
    },

    /**
     * Generate an SVG string representation of the QR Code
     * @param {Object} options
     * @returns {string} SVG xml
     */
    generateSVG: function (options) {
      const opts = Object.assign({
        text: "https://example.com",
        size: 1024,
        margin: 3,
        dotStyle: "rounded",
        cornerStyle: "rounded",
        fgColor: "#0f172a",
        fgColorEnd: "#3b82f6",
        gradientType: "linear-diagonal",
        bgColor: "#ffffff",
        cornerColor: null,
        logo: null
      }, options || {});

      const eccLevel = (opts.logo && opts.logo.image) ? QRErrorCorrectLevel.H : (opts.ecc || QRErrorCorrectLevel.M);
      const qr = new QRCodeModel(0, eccLevel);
      qr.addData(opts.text || "https://example.com");
      qr.make();

      const moduleCount = qr.getModuleCount();
      const canvasSize = opts.size || 1024;
      const totalModules = moduleCount + opts.margin * 2;
      const cellSize = canvasSize / totalModules;
      const marginPx = opts.margin * cellSize;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}">\n`;
      svg += `  <defs>\n`;

      let fillRef = opts.fgColor;
      if (opts.gradientType !== "none" && opts.fgColorEnd && opts.fgColorEnd !== opts.fgColor) {
        fillRef = "url(#qr-gradient)";
        let x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%";
        if (opts.gradientType === "linear-horizontal") { x1 = "0%"; y1 = "0%"; x2 = "100%"; y2 = "0%"; }
        else if (opts.gradientType === "linear-vertical") { x1 = "0%"; y1 = "0%"; x2 = "0%"; y2 = "100%"; }
        svg += `    <linearGradient id="qr-gradient" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">\n`;
        svg += `      <stop offset="0%" stop-color="${opts.fgColor}"/>\n`;
        svg += `      <stop offset="100%" stop-color="${opts.fgColorEnd}"/>\n`;
        svg += `    </linearGradient>\n`;
      }
      svg += `  </defs>\n`;

      // Background
      if (opts.bgColor && opts.bgColor !== "transparent") {
        svg += `  <rect width="${canvasSize}" height="${canvasSize}" fill="${opts.bgColor}"/>\n`;
      }

      function isFinder(row, col) {
        if (row < 7 && col < 7) return true;
        if (row < 7 && col >= moduleCount - 7) return true;
        if (row >= moduleCount - 7 && col < 7) return true;
        return false;
      }

      let logoArea = null;
      if (opts.logo && opts.logo.image) {
        const logoRatio = Math.min(Math.max(opts.logo.size || 0.22, 0.12), 0.32);
        const logoModCount = Math.floor(moduleCount * logoRatio);
        const centerStart = Math.floor((moduleCount - logoModCount) / 2);
        logoArea = { start: centerStart, end: centerStart + logoModCount };
      }

      function isUnderLogo(row, col) {
        if (!logoArea) return false;
        return (row >= logoArea.start && row < logoArea.end && col >= logoArea.start && col < logoArea.end);
      }

      // Modules
      svg += `  <g fill="${fillRef}">\n`;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinder(r, c) || isUnderLogo(r, c) || !qr.isDark(r, c)) continue;
          const x = marginPx + c * cellSize;
          const y = marginPx + r * cellSize;
          if (opts.dotStyle === "dots") {
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const radius = cellSize * 0.45;
            svg += `    <circle cx="${cx}" cy="${cy}" r="${radius}"/>\n`;
          } else if (opts.dotStyle === "rounded") {
            const rx = cellSize * 0.28;
            svg += `    <rect x="${x + 0.5}" y="${y + 0.5}" width="${cellSize - 1}" height="${cellSize - 1}" rx="${rx}"/>\n`;
          } else {
            svg += `    <rect x="${x}" y="${y}" width="${cellSize + 0.2}" height="${cellSize + 0.2}"/>\n`;
          }
        }
      }
      svg += `  </g>\n`;

      // Finder SVG
      const fColor = opts.cornerColor || fillRef;
      svg += renderSVGFinder(marginPx, marginPx, cellSize, opts.cornerStyle, fColor, opts.bgColor);
      svg += renderSVGFinder(marginPx + (moduleCount - 7) * cellSize, marginPx, cellSize, opts.cornerStyle, fColor, opts.bgColor);
      svg += renderSVGFinder(marginPx, marginPx + (moduleCount - 7) * cellSize, cellSize, opts.cornerStyle, fColor, opts.bgColor);

      // Embedded Logo
      if (opts.logo && opts.logo.imageSrc) {
        const logoSizePx = canvasSize * (opts.logo.size || 0.22);
        const centerPos = (canvasSize - logoSizePx) / 2;
        const badgePadding = opts.logo.padding || 8;
        const badgeSize = logoSizePx + badgePadding * 2;
        const badgePos = (canvasSize - badgeSize) / 2;

        if (opts.logo.badgeShape === "circle") {
          svg += `  <circle cx="${canvasSize / 2}" cy="${canvasSize / 2}" r="${badgeSize / 2}" fill="${opts.logo.badgeBg || '#ffffff'}" stroke="${opts.logo.badgeBorderColor || '#e2e8f0'}" stroke-width="${opts.logo.badgeBorder || 0}"/>\n`;
        } else {
          const rx = opts.logo.badgeShape === "square" ? 0 : badgeSize * 0.22;
          svg += `  <rect x="${badgePos}" y="${badgePos}" width="${badgeSize}" height="${badgeSize}" rx="${rx}" fill="${opts.logo.badgeBg || '#ffffff'}" stroke="${opts.logo.badgeBorderColor || '#e2e8f0'}" stroke-width="${opts.logo.badgeBorder || 0}"/>\n`;
        }

        svg += `  <image href="${opts.logo.imageSrc}" x="${centerPos}" y="${centerPos}" width="${logoSizePx}" height="${logoSizePx}" preserveAspectRatio="xMidYMid meet"/>\n`;
      }

      svg += `</svg>`;
      return svg;
    }
  };

  // ==========================================
  // 3. Helper Functions: Canvas Shapes & Badges
  // ==========================================

  function drawModule(ctx, x, y, size, dotStyle) {
    if (dotStyle === "dots") {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.44, 0, Math.PI * 2);
      ctx.fill();
    } else if (dotStyle === "rounded") {
      drawRoundRect(ctx, x + 0.4, y + 0.4, size - 0.8, size - 0.8, size * 0.28);
      ctx.fill();
    } else if (dotStyle === "classy") {
      // Diagonal soft corners
      ctx.beginPath();
      const r = size * 0.4;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x + size, y + size - r);
      ctx.arcTo(x + size, y + size, x + size - r, y + size, r);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.fill();
    } else {
      // Classic square (with micro-overlap to avoid canvas subpixel seams)
      ctx.fillRect(x, y, size + 0.2, size + 0.2);
    }
  }

  function drawRoundRect(ctx, x, y, width, height, radius) {
    if (radius <= 0) {
      ctx.rect(x, y, width, height);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawFinder(ctx, x, y, cellSize, cornerStyle, finderColor, bgColor) {
    const finderSize = 7 * cellSize;
    ctx.save();
    ctx.fillStyle = finderColor;

    if (cornerStyle === "circle") {
      // Outer ring
      ctx.beginPath();
      ctx.arc(x + finderSize / 2, y + finderSize / 2, finderSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Middle ring (background cut)
      ctx.fillStyle = bgColor || "#ffffff";
      ctx.beginPath();
      ctx.arc(x + finderSize / 2, y + finderSize / 2, finderSize / 2 - cellSize, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = finderColor;
      ctx.beginPath();
      ctx.arc(x + finderSize / 2, y + finderSize / 2, 1.5 * cellSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (cornerStyle === "rounded") {
      // Outer rounded frame
      drawRoundRect(ctx, x, y, finderSize, finderSize, cellSize * 1.8);
      ctx.fill();

      // Middle cut
      ctx.fillStyle = bgColor || "#ffffff";
      drawRoundRect(ctx, x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize, cellSize * 1.2);
      ctx.fill();

      // Center rounded dot
      ctx.fillStyle = finderColor;
      drawRoundRect(ctx, x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize, cellSize * 0.9);
      ctx.fill();
    } else {
      // Square Finder
      ctx.fillRect(x, y, finderSize, finderSize);
      ctx.fillStyle = bgColor || "#ffffff";
      ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = finderColor;
      ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }

    ctx.restore();
  }

  function renderSVGFinder(x, y, cellSize, cornerStyle, finderColor, bgColor) {
    const finderSize = 7 * cellSize;
    const bg = bgColor || "#ffffff";
    let svg = `  <g fill="${finderColor}">\n`;
    if (cornerStyle === "circle") {
      const cx = x + finderSize / 2;
      const cy = y + finderSize / 2;
      svg += `    <circle cx="${cx}" cy="${cy}" r="${finderSize / 2}" fill="${finderColor}"/>\n`;
      svg += `    <circle cx="${cx}" cy="${cy}" r="${finderSize / 2 - cellSize}" fill="${bg}"/>\n`;
      svg += `    <circle cx="${cx}" cy="${cy}" r="${1.5 * cellSize}" fill="${finderColor}"/>\n`;
    } else if (cornerStyle === "rounded") {
      svg += `    <rect x="${x}" y="${y}" width="${finderSize}" height="${finderSize}" rx="${cellSize * 1.8}" fill="${finderColor}"/>\n`;
      svg += `    <rect x="${x + cellSize}" y="${y + cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" rx="${cellSize * 1.2}" fill="${bg}"/>\n`;
      svg += `    <rect x="${x + 2 * cellSize}" y="${y + 2 * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}" rx="${cellSize * 0.9}" fill="${finderColor}"/>\n`;
    } else {
      svg += `    <rect x="${x}" y="${y}" width="${finderSize}" height="${finderSize}"/>\n`;
      svg += `    <rect x="${x + cellSize}" y="${y + cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" fill="${bg}"/>\n`;
      svg += `    <rect x="${x + 2 * cellSize}" y="${y + 2 * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}"/>\n`;
    }
    svg += `  </g>\n`;
    return svg;
  }

  function drawLogoBadge(ctx, canvasSize, logoConfig) {
    const img = logoConfig.image;
    if (!img) return;

    const ratio = Math.min(Math.max(logoConfig.size || 0.22, 0.12), 0.32);
    const logoSize = canvasSize * ratio;
    const padding = logoConfig.padding !== undefined ? logoConfig.padding : 10;
    const badgeSize = logoSize + padding * 2;
    const badgeX = (canvasSize - badgeSize) / 2;
    const badgeY = (canvasSize - badgeSize) / 2;
    const badgeShape = logoConfig.badgeShape || "rounded"; // 'circle', 'rounded', 'square', 'none'
    const badgeBg = logoConfig.badgeBg || "#ffffff";
    const borderWidth = logoConfig.badgeBorder !== undefined ? logoConfig.badgeBorder : 2;
    const borderColor = logoConfig.badgeBorderColor || "#e2e8f0";

    ctx.save();

    // 1. Draw Drop Shadow
    if (logoConfig.shadow !== false && badgeShape !== "none") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
    }

    // 2. Draw Badge Background
    if (badgeShape !== "none") {
      ctx.fillStyle = badgeBg;
      if (badgeShape === "circle") {
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const radius = badgeShape === "square" ? 0 : badgeSize * 0.24;
        drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, radius);
        ctx.fill();
      }
    }

    // Reset shadow for border and image
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 3. Draw Badge Border
    if (borderWidth > 0 && badgeShape !== "none") {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      if (badgeShape === "circle") {
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, badgeSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const radius = badgeShape === "square" ? 0 : badgeSize * 0.24;
        drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, radius);
        ctx.stroke();
      }
    }

    // 4. Draw Logo Inside Clip Region
    const imgX = (canvasSize - logoSize) / 2;
    const imgY = (canvasSize - logoSize) / 2;

    ctx.save();
    if (badgeShape === "circle") {
      ctx.beginPath();
      ctx.arc(canvasSize / 2, canvasSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
    } else if (badgeShape === "rounded") {
      drawRoundRect(ctx, imgX, imgY, logoSize, logoSize, logoSize * 0.2);
      ctx.clip();
    }

    // Maintain aspect ratio while fitting into logoSize box
    const nw = img.naturalWidth || img.width || logoSize;
    const nh = img.naturalHeight || img.height || logoSize;
    const scale = Math.min(logoSize / nw, logoSize / nh);
    const drawW = nw * scale;
    const drawH = nh * scale;
    const drawX = (canvasSize - drawW) / 2;
    const drawY = (canvasSize - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    ctx.restore();
  }

  // Export to global scope
  global.QREngine = QREngine;

})(typeof window !== "undefined" ? window : this);
