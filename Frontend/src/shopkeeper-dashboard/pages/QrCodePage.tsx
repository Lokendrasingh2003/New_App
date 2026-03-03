import DownloadIcon from '@mui/icons-material/Download'
import PrintIcon from '@mui/icons-material/Print'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import PageHeader from '../components/PageHeader'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { getQRCode } from '../services/shopService'

type QrSizeOption = 'small' | 'medium' | 'large'

const sizeMap: Record<QrSizeOption, number> = {
  small: 180,
  medium: 240,
  large: 320,
}

const QrCodePage = () => {
  const shopId = getShopkeeperShopId()
  const { showSuccess, showError } = useAppFeedback()
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [shopLink, setShopLink] = useState('')
  const [qrCodeImage, setQrCodeImage] = useState('')
  const [slug, setSlug] = useState('shop')
  const [qrSize, setQrSize] = useState<QrSizeOption>('medium')
  const [includeShopName, setIncludeShopName] = useState(true)
  const qrSvgWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!shopId) {
      setPageError('Shop not found for current session.')
      setIsLoading(false)
      return
    }

    const loadQrCode = async () => {
      try {
        setPageError('')
        setIsLoading(true)
        const data = await getQRCode(shopId)
        setShopLink(data.shopLink)
        setQrCodeImage(data.qrCodeImage)

        const linkSlug = data.shopLink.split('/').filter(Boolean).pop()
        if (linkSlug) {
          setSlug(linkSlug)
        }
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to load QR code.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadQrCode()
  }, [shopId])

  const qrValue = shopLink
  const qrPixels = useMemo(() => sizeMap[qrSize], [qrSize])

  const handleDownloadPng = () => {
    if (!qrCodeImage) {
      showError('QR not ready yet')
      return
    }

    const anchor = document.createElement('a')
    anchor.href = qrCodeImage
    anchor.download = `${slug}-qr.png`
    anchor.click()
    showSuccess('PNG downloaded')
  }

  const handleDownloadSvg = () => {
    const wrapper = qrSvgWrapRef.current
    const svgElement = wrapper?.querySelector('svg')
    if (!svgElement) {
      showError('QR not ready yet')
      return
    }

    const svgMarkup = svgElement.outerHTML
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slug}-qr.svg`
    anchor.click()
    URL.revokeObjectURL(url)
    showSuccess('SVG downloaded')
  }

  const handlePrint = () => {
    if (!qrCodeImage) {
      showError('QR not ready yet')
      return
    }

    const printWindow = window.open('', '_blank', 'width=700,height=800')
    if (!printWindow) {
      showError('Unable to open print window')
      return
    }

    const heading = includeShopName ? `<h2 style="margin-bottom:16px;">${slug}</h2>` : ''
    printWindow.document.write(`
      <html>
        <head><title>Print QR</title></head>
        <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;">
          <div style="text-align:center;">
            ${heading}
            <img src="${qrCodeImage}" alt="Shop QR" />
            <p style="margin-top:12px;color:#555;">${qrValue}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    showSuccess('Print started')
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
              onClick: handleDownloadPng,
              variant: 'outlined',
              startIcon: <DownloadIcon />,
            },
            {
              label: 'Download SVG',
              onClick: handleDownloadSvg,
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

        {pageError ? <Alert severity="error">{pageError}</Alert> : null}

        <Card id="qr-preview-card" sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Your Shop QR Code</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customers can scan this QR code to visit your shop page.
            </Typography>
            {isLoading ? (
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Loading QR code...
                </Typography>
              </Stack>
            ) : null}
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
              {qrCodeImage ? <Box component="img" src={qrCodeImage} alt="Shop QR" sx={{ width: qrPixels, height: qrPixels }} /> : null}
              {includeShopName && <Typography sx={{ fontWeight: 600 }}>{slug}</Typography>}
              <Typography variant="body2" color="text.secondary">
                {qrValue}
              </Typography>
              <Box ref={qrSvgWrapRef} sx={{ display: 'none' }}>
                <QRCodeSVG value={qrValue || ' '} size={qrPixels} level="H" includeMargin />
              </Box>
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
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPng}>
                Download PNG
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadSvg}>
                Download SVG
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
