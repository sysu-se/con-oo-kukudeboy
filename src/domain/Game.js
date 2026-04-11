import { Sudoku } from './Sudoku.js'
import { cloneGrid } from './utils.js'

/**
 * 将输入统一转换成可被 Game 安全持有的 Sudoku 实例
 * @param {Sudoku | { getGrid: Function, getGivens?: Function }} sudoku
 * @returns {Sudoku}
 */
function coerceSudoku(sudoku) {
	if (sudoku instanceof Sudoku) {
		return sudoku.clone()
	}

	if (!sudoku || typeof sudoku.getGrid !== 'function') {
		throw new Error('Game requires a Sudoku-like object')
	}

	return new Sudoku({
		grid: sudoku.getGrid(),
		givens: typeof sudoku.getGivens === 'function' ? sudoku.getGivens() : sudoku.getGrid(),
	})
}

/**
 * 游戏领域对象，负责管理当前数独对象以及撤销/重做历史
 */
export class Game {
	/** @type {Sudoku} 当前游戏持有的数独对象 */
	#sudoku
	/** @type {number[][][]} 撤销历史栈 */
	#undoStack
	/** @type {number[][][]} 重做历史栈 */
	#redoStack

	/**
	 * 创建一个 Game 实例
	 * @param {Object} params
	 * @param {Sudoku} params.sudoku - 当前需要被管理的数独对象
	 * @param {number[][][]} [params.undoStack=[]] - 撤销历史快照
	 * @param {number[][][]} [params.redoStack=[]] - 重做历史快照
	 */
	constructor({ sudoku, undoStack = [], redoStack = [] }) {
		this.#sudoku = coerceSudoku(sudoku)
		this.#undoStack = undoStack.map(snapshot => cloneGrid(snapshot))
		this.#redoStack = redoStack.map(snapshot => cloneGrid(snapshot))
	}

	/**
	 * 获取当前数独对象的克隆副本
	 * @returns {Sudoku}
	 */
	getSudoku() {
		return this.#sudoku.clone()
	}

	/**
	 * 执行一次填数操作，并在成功后写入撤销历史
	 * @param {{ row: number, col: number, value: number }} move - 玩家输入
	 */
	guess(move) {
		const previousGrid = this.#sudoku.getGrid()
		const workingCopy = this.#sudoku.clone()
		workingCopy.guess(move)

		this.#undoStack.push(previousGrid)
		this.#redoStack = []
		this.#sudoku = workingCopy
	}

	/**
	 * 撤销最近一次成功的输入
	 */
	undo() {
		if (!this.canUndo()) {
			return
		}

		this.#redoStack.push(this.#sudoku.getGrid())
		const previousGrid = this.#undoStack.pop()
		this.#sudoku = new Sudoku({
			grid: previousGrid,
			givens: this.#sudoku.getGivens(),
		})
	}

	/**
	 * 重做最近一次被撤销的输入
	 */
	redo() {
		if (!this.canRedo()) {
			return
		}

		this.#undoStack.push(this.#sudoku.getGrid())
		const nextGrid = this.#redoStack.pop()
		this.#sudoku = new Sudoku({
			grid: nextGrid,
			givens: this.#sudoku.getGivens(),
		})
	}

	/**
	 * 判断当前是否可以执行撤销
	 * @returns {boolean}
	 */
	canUndo() {
		return this.#undoStack.length > 0
	}

	/**
	 * 判断当前是否可以执行重做
	 * @returns {boolean}
	 */
	canRedo() {
		return this.#redoStack.length > 0
	}

	/**
	 * 将当前游戏对象序列化为 JSON 兼容结构
	 * @returns {{ type: string, version: number, sudoku: Object, undoStack: number[][][], redoStack: number[][][] }}
	 */
	toJSON() {
		return {
			type: 'Game',
			version: 2,
			sudoku: this.#sudoku.toJSON(),
			undoStack: this.#undoStack.map(snapshot => cloneGrid(snapshot)),
			redoStack: this.#redoStack.map(snapshot => cloneGrid(snapshot)),
		}
	}
}
