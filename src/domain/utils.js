export const GRID_SIZE = 9
export const BOX_SIZE = 3

/**
 * 创建一个全新的 9x9 空数独网格
 * @returns {number[][]}
 */
export function createEmptyGrid() {
	return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
}

/**
 * 深拷贝数独网格（二维数字数组）
 * @param {number[][]} grid - 需要拷贝的 9x9 数独网格
 * @returns {number[][]}
 */
export function cloneGrid(grid) {
	return grid.map(row => [...row])
}

/**
 * 校验网格是否为合法的 9x9 数独数据
 * @param {number[][]} grid - 待校验的网格
 * @param {string} [label='Sudoku grid'] - 错误提示中使用的名称
 * @throws {Error} 当网格结构非法或包含超出范围的值时抛出异常
 */
export function validateGrid(grid, label = 'Sudoku grid') {
	if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
		throw new Error(`${label} must be a 9x9 array`)
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== GRID_SIZE) {
			throw new Error(`${label} must be a 9x9 array`)
		}

		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > GRID_SIZE) {
				throw new Error(`${label} must contain only integers from 0 to 9`)
			}
		}
	}
}

/**
 * 校验并标准化一次玩家输入
 * @param {Object} move - 包含 row、col、value 的移动对象
 * @param {number} move.row - 行坐标（0-8）
 * @param {number} move.col - 列坐标（0-8）
 * @param {number} move.value - 填入的值（0-9，0 表示清空）
 * @returns {{ row: number, col: number, value: number }}
 * @throws {Error} 当输入对象结构不合法时抛出异常
 */
export function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object')
	}

	const { row, col, value } = move

	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new Error('Move row out of range')
	}

	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new Error('Move col out of range')
	}

	if (!Number.isInteger(value) || value < 0 || value > GRID_SIZE) {
		throw new Error('Move value out of range')
	}

	return { row, col, value }
}

/**
 * 深拷贝冲突坐标列表
 * @param {{ row: number, col: number }[]} conflicts - 冲突坐标数组
 * @returns {{ row: number, col: number }[]}
 */
export function cloneConflicts(conflicts) {
	return conflicts.map(({ row, col }) => ({ row, col }))
}
