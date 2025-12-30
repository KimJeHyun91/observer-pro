import { useState } from 'react'

export default function BillboardModal({ onClose, onSubmit }) {
  const [line1, setLine1] = useState('')
  const [color1, setColor1] = useState('1')
  const [effect1, setEffect1] = useState('0')

  const [line2, setLine2] = useState('')
  const [color2, setColor2] = useState('1')
  const [effect2, setEffect2] = useState('0')

  const handleSubmit = () => {
    onSubmit({
      first: {
        text: line1,
        color: parseInt(color1),
        effect: parseInt(effect1)
      },
      second: {
        text: line2,
        color: parseInt(color2),
        effect: parseInt(effect2)
      }
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[600px] shadow-xl text-gray-800 dark:text-white">
        <h2 className="text-lg font-bold mb-4">전광판 메시지 입력</h2>

        {[1, 2].map((lineIndex) => {
          const line = lineIndex === 1 ? line1 : line2
          const color = lineIndex === 1 ? color1 : color2
          const effect = lineIndex === 1 ? effect1 : effect2
          const setLine = lineIndex === 1 ? setLine1 : setLine2
          const setColor = lineIndex === 1 ? setColor1 : setColor2
          const setEffect = lineIndex === 1 ? setEffect1 : setEffect2

          return (
            <div className="flex items-center space-x-2 mb-3" key={lineIndex}>
              <input
                type="text"
                maxLength={15} 
                className="flex-1 h-8 px-2 rounded bg-gray-100 dark:bg-gray-700 dark:text-white"
                placeholder={`${lineIndex}번째 줄 입력`}
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
              <select
                className="h-8 px-2 rounded bg-gray-100 dark:bg-gray-700 dark:text-white"
                value={effect}
                onChange={(e) => setEffect(e.target.value)}
              >
                <option value="0">고정</option>
                <option value="1">왼쪽 스크롤</option>
                <option value="2">오른쪽 스크롤</option>
              </select>
              <select
                className={`h-8 px-2 rounded bg-gray-100 dark:bg-gray-700 
                ${color === '1' ? 'text-red-500' :
                    color === '2' ? 'text-green-500' :
                      color === '3' ? 'text-yellow-500' :
                        color === '4' ? 'text-blue-500' :
                          color === '5' ? 'text-purple-500' :
                            color === '6' ? 'text-cyan-500' :
                              color === '7' ? 'text-white' : 'text-gray-800 dark:text-white'}`}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                <option value="1">빨강</option>
                <option value="2">초록</option>
                <option value="3">노랑</option>
                <option value="4">파랑</option>
                <option value="5">보라</option>
                <option value="6">하늘</option>
                <option value="7">흰색</option>
              </select>
            </div>
          )
        })}

        <div className="flex justify-end mt-6 space-x-2">
          <button
            className="w-[100px] h-[34px] bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="w-[100px] h-[34px] bg-[#17A36F] text-white rounded"
            onClick={handleSubmit}
          >
            변경
          </button>
        </div>
      </div>
    </div>
  )
}
