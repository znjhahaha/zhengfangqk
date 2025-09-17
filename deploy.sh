#!/bin/bash

# TYUST选课工具部署脚本
# 使用方法: ./deploy.sh [production|staging]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
}

# 检查必要的文件
check_files() {
    local required_files=("Dockerfile" "docker-compose.yml" "nginx.conf" "package.json")
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "缺少必要文件: $file"
            exit 1
        fi
    done
    
    log_success "所有必要文件检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p logs/nginx
    mkdir -p ssl
    mkdir -p backup
    
    log_success "目录创建完成"
}

# 生成自签名SSL证书（仅用于测试）
generate_ssl_cert() {
    if [[ ! -f "ssl/cert.pem" ]] || [[ ! -f "ssl/key.pem" ]]; then
        log_warning "未找到SSL证书，生成自签名证书（仅用于测试）"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
        
        log_success "自签名SSL证书生成完成"
        log_warning "生产环境请使用正式的SSL证书"
    else
        log_success "SSL证书已存在"
    fi
}

# 构建Docker镜像
build_image() {
    log_info "构建Docker镜像..."
    
    docker-compose build --no-cache
    
    log_success "Docker镜像构建完成"
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    
    docker-compose down
    
    log_success "服务停止完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    docker-compose up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "服务已就绪"
            return 0
        fi
        
        log_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "服务启动超时"
    return 1
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker-compose ps
    
    echo ""
    log_info "服务日志:"
    docker-compose logs --tail=20
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    local backup_file="backup/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude=logs \
        .
    
    log_success "数据备份完成: $backup_file"
}

# 清理旧镜像
cleanup() {
    log_info "清理未使用的Docker镜像..."
    
    docker image prune -f
    
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "TYUST选课工具部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -b, --backup   部署前备份数据"
    echo "  -c, --cleanup  部署后清理未使用的镜像"
    echo "  --ssl-only     仅生成SSL证书"
    echo "  --build-only   仅构建镜像"
    echo "  --start-only   仅启动服务"
    echo "  --stop-only    仅停止服务"
    echo ""
    echo "示例:"
    echo "  $0                    # 完整部署"
    echo "  $0 -b -c             # 备份后部署并清理"
    echo "  $0 --ssl-only        # 仅生成SSL证书"
    echo "  $0 --build-only      # 仅构建镜像"
}

# 主函数
main() {
    local backup=false
    local cleanup_flag=false
    local ssl_only=false
    local build_only=false
    local start_only=false
    local stop_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--backup)
                backup=true
                shift
                ;;
            -c|--cleanup)
                cleanup_flag=true
                shift
                ;;
            --ssl-only)
                ssl_only=true
                shift
                ;;
            --build-only)
                build_only=true
                shift
                ;;
            --start-only)
                start_only=true
                shift
                ;;
            --stop-only)
                stop_only=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示欢迎信息
    echo "=========================================="
    echo "    TYUST选课工具部署脚本"
    echo "=========================================="
    echo ""
    
    # 检查环境
    check_root
    check_docker
    check_files
    
    # 根据选项执行相应操作
    if [[ "$stop_only" == true ]]; then
        stop_services
        exit 0
    fi
    
    if [[ "$ssl_only" == true ]]; then
        create_directories
        generate_ssl_cert
        exit 0
    fi
    
    if [[ "$build_only" == true ]]; then
        build_image
        exit 0
    fi
    
    if [[ "$start_only" == true ]]; then
        start_services
        wait_for_services
        show_status
        exit 0
    fi
    
    # 完整部署流程
    if [[ "$backup" == true ]]; then
        backup_data
    fi
    
    create_directories
    generate_ssl_cert
    stop_services
    build_image
    start_services
    
    if wait_for_services; then
        show_status
        
        if [[ "$cleanup_flag" == true ]]; then
            cleanup
        fi
        
        echo ""
        log_success "部署完成！"
        echo ""
        echo "访问地址:"
        echo "  HTTP:  http://localhost"
        echo "  HTTPS: https://localhost"
        echo "  健康检查: http://localhost:3000/api/health"
        echo ""
        echo "管理命令:"
        echo "  查看日志: docker-compose logs -f"
        echo "  重启服务: docker-compose restart"
        echo "  停止服务: docker-compose down"
        echo "  更新部署: ./deploy.sh"
    else
        log_error "部署失败"
        exit 1
    fi
}

# 执行主函数
main "$@"
