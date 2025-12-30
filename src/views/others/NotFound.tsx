import { Link } from 'react-router-dom'

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-500">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-6 dark:text-[#FFFFFF]">페이지를 찾을 수 없습니다.</p>
            <Link
                to="/"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                홈으로 돌아가기
            </Link>
        </div>
    )
}

export default NotFound
