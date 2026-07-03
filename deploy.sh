# ═══════════════════════════════════════════════════════════════════════
#  Deploy — copy the radiator to pappy's nginx
#  Run on pappy:
#    git clone ... /var/www/radiator
#    cd /var/www/radiator && python3 build.py
#
#  Or from this machine (if you have scp access):
#    scp -r dist/* pappy:/var/www/html/radiator/
# ═══════════════════════════════════════════════════════════════════════

echo "Deploy the contents of dist/ to pappy's nginx directory."
echo "Then access: http://pappy/radiator/"
