/**
 * Parses tables from
 * https://oldwww.nvg.ntnu.no/amiga/MC680x0_Sections/mc68000timing.HTML
 *
 */

const movTbl = `     	 Dn	 An	 (An)	 (An)+	-(An)	 d(An)	d(An,ix) xxx.W	xxx.L
Dn	 4(1/0)	 4(1/0)	 8(1/1)	 8(1/1)  8(1/1)	12(2/1) 14(2/1) 12(2/1) 16(3/1)
An	 4(1/0)	 4(1/0)	 8(1/1)	 8(1/1)	 8(1/1)	12(2/1) 14(2/1) 12(2/1) 16(3/1)
(An)	 8(2/0)	 8(2/0)	12(2/1) 12(2/1) 12(2/1) 16(3/1) 18(3/1) 16(3/1) 20(4/1)
(An)+	 8(2/0)	 8(2/0) 12(2/1) 12(2/1) 12(2/1) 16(3/1) 18(3/1) 16(3/1) 20(4/1)
-(An)	10(2/0) 10(2/0) 14(2/1) 14(2/1) 14(2/1) 18(3/1) 20(4/1) 18(3/1) 22(4/1)
d(An)	12(3/0) 12(3/0) 16(3/1) 16(3/1) 16(3/1) 20(4/1) 22(4/1) 20(4/1) 24(5/1)
d(An,ix) 14(3/0) 14(3/0) 18(3/1) 18(3/1) 18(3/1) 22(4/1) 24(4/1) 22(4/1) 26(5/1)
xxx.W	12(3/0) 12(3/0) 16(3/1) 16(3/1) 16(3/1) 20(4/1) 22(4/1) 20(4/1) 24(5/1)
xxx.L	16(4/0) 16(4/0) 20(4/1) 20(4/1) 20(4/1) 24(5/1) 26(5/1) 24(5/1) 28(6/1)
d(PC)	12(3/0) 12(3/0) 16(3/1) 16(3/1) 16(3/1) 20(4/1) 22(4/1) 20(4/1) 24(5/1)
d(PC,ix) 14(3/0) 14(3/0) 18(3/1) 18(3/1) 18(3/1) 22(4/1) 24(4/1) 22(4/1) 26(5/1)
#xxx	 8(2/0)	 8(2/0) 12(2/1) 12(2/1) 12(2/1) 16(3/1) 18(3/1) 16(3/1) 20(4/1)`;

const movlTbl = `     	 Dn	 An	 (An)	 (An)+	-(An)	 d(An)	d(An,ix) xxx.W	xxx.L
Dn	 4(1/0)	 4(1/0)	12(1/2)	12(1/2)	12(1/2)	16(2/2)	18(2/2)	16(2/2)	20(3/2)
An	 4(1/0)	 4(1/0)	12(1/2)	12(1/2)	12(1/2)	16(2/2)	18(2/2)	16(2/2)	20(3/2)
(An)	12(3/0)	12(3/0)	20(3/2)	20(3/2)	20(3/2)	24(4/2)	26(4/2)	24(4/2)	28(5/2)
(An)+	12(3/0)	12(3/0)	20(3/2)	20(3/2)	20(3/2)	24(4/2)	26(4/2)	24(4/2)	28(5/2)
-(An)	14(3/0)	14(3/0)	22(3/2)	22(3/2)	22(3/2)	26(4/2)	28(4/2)	26(4/2)	30(5/2)
d(An)	16(4/0)	16(4/0)	24(4/2)	24(4/2)	24(4/2)	28(5/2)	30(5/2)	28(5/2)	32(6/2)
d(An,ix) 18(4/0)	18(4/0)	26(4/2)	26(4/2)	26(4/2)	30(5/2)	32(5/2)	30(5/2)	34(6/2)
xxx.W	16(4/0)	16(4/0)	24(4/2)	24(4/2)	24(4/2)	28(5/2)	30(5/2)	28(5/2)	32(6/2)
xxx.L	20(5/0)	20(5/0)	28(5/2)	28(5/2)	28(5/2)	32(6/2)	34(6/2)	32(6/2)	36(7/2)
d(PC)	16(4/0)	16(4/0)	24(4/2)	24(4/2)	24(4/2)	28(5/2)	30(5/2)	28(5/2)	32(5/2)
d(PC,ix) 18(4/0)	18(4/0)	26(4/2)	26(4/2)	26(4/2)	30(5/2)	32(5/2)	30(5/2)	34(6/2)
#xxx	12(3/0)	12(3/0)	20(3/2)	20(3/2)	20(3/2)	24(4/2)	26(4/2)	24(4/2)	28(5/2)`;

const eaTimesTbl = `(An)	 address register indirect		 4(1/0)		 8(2/0)
(An)+	 address register indirect with post-	 4(1/0)		 8(2/0)
-(An)	 address register indirect with predec.	 6(1/0)		10(2/0)
d(An)	 address register indirect with dis-	 8(2/0)		12(3/0)
d(An,ix) address register indirect with index	10(2/0)		14(3/0)
xxx.W	 absolute short				 8(2/0)		12(3/0)
xxx.L	 absolute long				12(3/0)		16(4/0)
d(PC)	 program counter with displacement	 8(2/0)		12(3/0)
d(PC,ix) program counter with index		10(2/0)		14(3/0)
#xxx	 immediate				 4(1/0)		 8(2/0)`;

function parseTimes(timeStr) {
  const [cycles, readBus, writeBus] = timeStr
    .split(/[/)()]/g)
    .filter((n) => n)
    .map((n) => parseInt(n, 10));
  return { cycles, readBus, writeBus };
}

function parseTbl(tbl) {
  const rows = tbl.split("\n").map((r) => r.trim().split(/\s+/g));
  const arg1 = rows.shift();
  const arg2 = rows.map((r) => r.shift());
  const values = rows.map((r) => r.map(parseTimes));

  const list = {};
  for (let i in arg2) {
    for (let j in values[i]) {
      const args = [arg2[i], arg1[j]].join(",");
      list[args] = values[i][j];
    }
  }
  return list;
}

const mov = parseTbl(movTbl);
const movl = parseTbl(movlTbl);

console.log("const mov = " + JSON.stringify(mov));
console.log("const movl = " + JSON.stringify(movl));

const eaTimes = eaTimesTbl
  .split("\n")
  .map((r) => r.trim().split(/\s+/g))
  .reduce((acc, n) => {
    const [wordByte, long] = n.slice(-2).map(parseTimes);
    acc[n[0]] = { wordByte, long };
    return acc;
  }, {});

console.log(JSON.stringify(eaTimes));
