import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <span className="text-4xl">404</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            页面未找到
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            抱歉，您访问的页面不存在或已被移动。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            请检查URL是否正确，或返回首页继续浏览。
          </div>
          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回上页
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
