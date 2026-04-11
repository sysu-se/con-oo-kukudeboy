import { BOX_SIZE, cloneConflicts, cloneGrid, normalizeMove, validateGrid } from './utils.js'

/**
 * 将构造输入统一整理成 { grid, givens } 的结构
 * @param {number[][] | { grid: number[][], givens?: number[][] }} input
 * @returns {{ grid: number[][], givens: number[][] }}
 */
function normalizeSudokuInput(input) {
	if (Array.isArray(input)) {
		return {
			grid: input,
			givens: input,
		}
	}

	if (!input || typeof input !== 'object') {
		throw new Error('Sudoku input must be a grid or a configuration object')
	}

	const { grid, givens = grid } = input
	return { grid, givens }
}

/**
 * 数独领域对象，负责管理盘面、固定题面以及基础数独规则
 */
export class Sudoku {
	/** @type {number[][]} 当前正在被操作的数独盘面 */
	#grid
	/** @type {number[][]} 初始固定题面，用于判断格子是否可编辑 */
	#givens

	/**
	 * 创建一个 Sudoku 实例
	 * @param {number[][] | { grid: number[][], givens?: number[][] }} input - 原始网格或带 givens 的配置对象
	 */
	constructor(input) {
		const { grid, givens } = normalizeSudokuInput(input)
		validateGrid(grid)
		validateGrid(givens, 'Sudoku givens')

		this.#grid = cloneGrid(grid)
		this.#givens = cloneGrid(givens)
	}

	/**
	 * 获取当前盘面的深拷贝副本
	 * @returns {number[][]}
	 */
	getGrid() {
		return cloneGrid(this.#grid)
	}

	/**
	 * 获取固定题面的深拷贝副本
	 * @returns {number[][]}
	 */
	getGivens() {
		return cloneGrid(this.#givens)
	}

	/**
	 * 判断指定格子是否允许修改
	 * @param {number} row - 行坐标
	 * @param {number} col - 列坐标
	 * @returns {boolean}
	 */
	isEditableCell(row, col) {
		return this.#givens[row][col] === 0
	}

	/**
	 * 对指定位置执行一次填数或清空操作
	 * @param {{ row: number, col: number, value: number }} move - 玩家输入
	 */
	guess(move) {
		const { row, col, value } = normalizeMove(move)
		if (!this.isEditableCell(row, col)) {
			throw new Error('Cannot change a given cell')
		}

		this.#grid[row][col] = value
	}

	/**
	 * 克隆当前数独对象
	 * @returns {Sudoku}
	 */
	clone() {
		return new Sudoku({
			grid: this.#grid,
			givens: this.#givens,
		})
	}

	/**
	 * 计算当前盘面中的所有冲突格子
	 * @returns {{ row: number, col: number }[]}
	 */
	getConflicts() {
		const conflicts = []
		const seen = new Set()

		// 避免同一个冲突格子被重复加入结果数组
		const addConflict = (row, col) => {
			const key = `${row},${col}`
			if (!seen.has(key)) {
				seen.add(key)
				conflicts.push({ row, col })
			}
		}

		for (let row = 0; row < this.#grid.length; row++) {
			for (let col = 0; col < this.#grid[row].length; col++) {
				const value = this.#grid[row][col]
				if (value === 0) {
					continue
				}

				for (let i = 0; i < this.#grid.length; i++) {
					if (i !== col && this.#grid[row][i] === value) {
						addConflict(row, col)
						addConflict(row, i)
					}

					if (i !== row && this.#grid[i][col] === value) {
						addConflict(row, col)
						addConflict(i, col)
					}
				}

				const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE
				const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE
				for (let r = startRow; r < startRow + BOX_SIZE; r++) {
					for (let c = startCol; c < startCol + BOX_SIZE; c++) {
						if ((r !== row || c !== col) && this.#grid[r][c] === value) {
							addConflict(row, col)
							addConflict(r, c)
						}
					}
				}
			}
		}

		return cloneConflicts(conflicts)
	}

	/**
	 * 判断当前盘面是否满足基本数独规则
	 * @returns {boolean}
	 */
	isValidBoard() {
		return this.getConflicts().length === 0
	}

	/**
	 * 判断当前盘面是否已经完成且合法
	 * @returns {boolean}
	 */
	isSolved() {
		for (const row of this.#grid) {
			for (const cell of row) {
				if (cell === 0) {
					return false
				}
			}
		}

		return this.isValidBoard()
	}

	/**
	 * 将当前对象序列化为 JSON 兼容的数据结构
	 * @returns {{ type: string, version: number, grid: number[][], givens: number[][] }}
	 */
	toJSON() {
		return {
			type: 'Sudoku',
			version: 2,
			grid: this.getGrid(),
			givens: this.getGivens(),
		}
	}

	/**
	 * 将当前盘面转换成便于调试的多行字符串
	 * @returns {string}
	 */
	toString() {
		return this.#grid
			.map(row => row.map(cell => (cell === 0 ? '.' : String(cell))).join(' '))
			.join('\n')
	}
}
