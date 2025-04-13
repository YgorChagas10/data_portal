#!/bin/bash

# Verifica se está rodando como root
if [ "$EUID" -ne 0 ]; then 
  echo "Por favor, execute como root (sudo)"
  exit 1
fi

# Configurações
APP_DIR="/opt/data-portal"
BACKUP_DIR="/opt/backups/data-portal"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretórios necessários
mkdir -p $APP_DIR $BACKUP_DIR

# Backup da versão atual
if [ -d "$APP_DIR" ]; then
  echo "Fazendo backup da versão atual..."
  tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C $APP_DIR .
fi

# Copiar arquivos novos
echo "Copiando arquivos novos..."
cp -r . $APP_DIR/

# Configurar permissões
echo "Configurando permissões..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Verificar certificados SSL
if [ ! -f "/etc/nginx/ssl/your-domain.crt" ]; then
  echo "AVISO: Certificados SSL não encontrados!"
  echo "Por favor, configure os certificados SSL em /etc/nginx/ssl/"
  exit 1
fi

# Parar containers antigos
echo "Parando containers antigos..."
cd $APP_DIR && docker-compose -f docker-compose.prod.yml down

# Construir e iniciar novos containers
echo "Construindo e iniciando novos containers..."
cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d --build

# Verificar status
echo "Verificando status dos containers..."
docker-compose -f docker-compose.prod.yml ps

echo "Deploy concluído!" 