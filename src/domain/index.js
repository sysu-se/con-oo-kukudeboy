import { Game } from './Game.js'
import { Sudoku } from './Sudoku.js'

/**
 * 工厂函数：根据输入网格创建一个 Sudoku 对象
 * @param {number[][] | { grid: number[][], givens?: number[][] }} input
 * @returns {Sudoku}
 */
export function createSudoku(input) {
	return new Sudoku(input)
}

/**
 * 工厂函数：根据 JSON 数据恢复 Sudoku 对象
 * @param {Object} json - Sudoku 的序列化结果
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Invalid Sudoku JSON')
	}

	if (json.type && json.type !== 'Sudoku') {
		throw new Error('Invalid Sudoku JSON type')
	}

	return new Sudoku({
		grid: json.grid,
		givens: json.givens ?? json.grid,
	})
}

/**
 * 工厂函数：根据 Sudoku 对象创建 Game 对象
 * @param {{ sudoku: Sudoku }} params
 * @returns {Game}
 */
export function createGame({ sudoku }) {
	return new Game({ sudoku })
}

/**
 * 工厂函数：根据 JSON 数据恢复 Game 对象
 * @param {Object} json - Game 的序列化结果
 * @returns {Game}
 */
export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Invalid Game JSON')
	}

	if (json.type && json.type !== 'Game') {
		throw new Error('Invalid Game JSON type')
	}

	return new Game({
		sudoku: createSudokuFromJSON(json.sudoku),
		undoStack: Array.isArray(json.undoStack) ? json.undoStack : [],
		redoStack: Array.isArray(json.redoStack) ? json.redoStack : [],
	})
}
