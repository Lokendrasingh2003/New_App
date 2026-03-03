import DownloadIcon from '@mui/icons-material/Download'
import PrintIcon from '@mui/icons-material/Print'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

type QrSizeOption = 'small' | 'medium' | 'large'

const sizeMap: Record<QrSizeOption, number> = {
  small: 180,
  medium: 240,
  large: 320,
}

const QrCodePage = () => {
  const { shop, getPublicUrl } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [qrSize, setQrSize] = useState<QrSizeOption>('medium')
  const [includeShopName, setIncludeShopName] = useState(true)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const qrValue = getPublicUrl()
  const qrPixels = useMemo(() => sizeMap[qrSize], [qrSize])

  const handleDownload = () => {
    const canvas = qrCanvasRef.current
    if (!canvas) {
      showMessage('QR not ready yet')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${shop.slug}-qr.png`
    anchor.click()
    showMessage('QR downloaded')
  }

  const handlePrint = () => {
    const canvas = qrCanvasRef.current
    if (!canvas) {
      showMessage('QR not ready yet')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank', 'width=700,height=800')
    if (!printWindow) {
      showMessage('Unable to open print window')
      return
    }

    const heading = includeShopName ? `<h2 style="margin-bottom:16px;">${shop.shopName}</h2>` : ''
    printWindow.document.write(`
      <html>
        <head><title>Print QR</title></head>
        <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;">
          <div style="text-align:center;">
            ${heading}
            <img src="${dataUrl}" alt="Shop QR" />
            <p style="margin-top:12px;color:#555;">${qrValue}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    showMessage('Print started')
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="QR Code"
          subtitle="Generate and share your shop's QR code"
          actions={[
            {
              label: 'Download PNG',
              onClick: handleDownload,
              variant: 'outlined',
              startIcon: <DownloadIcon />,
            },
            {
              label: 'Print',
              onClick: handlePrint,
              variant: 'contained',
              color: 'primary',
              startIcon: <PrintIcon />,
            },
          ]}
        />

        <Card id="qr-preview-card" sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Your Shop QR Code</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customers can scan this QR code to visit your shop page.
            </Typography>
            <Box
              sx={{
                backgroundColor: '#F8FAFC',
                borderRadius: 2.5,
                border: '1px dashed rgba(15, 23, 42, 0.2)',
                p: 4,
                gap: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 340,
              }}
            >
              <QRCodeCanvas
                id="shop-qr-canvas"
                value={qrValue}
                size={qrPixels}
                level="H"
                includeMargin
                ref={(node) => {
                  qrCanvasRef.current = node
                }}
              />
              {includeShopName && <Typography sx={{ fontWeight: 600 }}>{shop.shopName}</Typography>}
              <Typography variant="body2" color="text.secondary">
                {qrValue}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Options</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="QR Size"
                value={qrSize}
                onChange={(event) => setQrSize(event.target.value as QrSizeOption)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch checked={includeShopName} onChange={(_, checked) => setIncludeShopName(checked)} />
                }
                label="Include shop name"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
                Download PNG
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                Print
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}

export default QrCodePage
