import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const ShopLinkPage = () => {
  const { shop, getPublicUrl } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [previewOpen, setPreviewOpen] = useState(false)

  const shopLink = getPublicUrl()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shopLink)
      showMessage('Copied')
    } catch {
      showMessage('Unable to copy. Please copy manually.')
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Shop Link"
          subtitle="Share your shop with customers"
          actions={[
            {
              label: 'Copy Link',
              onClick: handleCopy,
              variant: 'outlined',
              startIcon: <ContentCopyIcon />,
            },
            {
              label: 'Preview',
              onClick: () => setPreviewOpen(true),
              variant: 'contained',
              color: 'primary',
              startIcon: <OpenInNewIcon />,
            },
          ]}
        />

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Stack spacing={2.2}>
              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid rgba(15,23,42,0.08)',
                  p: 1.5,
                  bgcolor: 'rgba(248,250,252,0.8)',
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.4, color: 'text.secondary' }}>
                  Share Ready Link
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use this URL in WhatsApp, Instagram bio, QR poster and order receipts.
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Public URL</Typography>
                <TextField fullWidth value={shopLink} slotProps={{ htmlInput: { readOnly: true } }} />
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Slug</Typography>
                <TextField fullWidth value={shop.slug} slotProps={{ htmlInput: { readOnly: true } }} />
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button variant="outlined" startIcon={<FileCopyIcon />} onClick={handleCopy}>
                  Copy Link
                </Button>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
                  Copy QR Link
                </Button>
                <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => setPreviewOpen(true)}>
                  Preview
                </Button>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Share this link on WhatsApp, posters, and social media.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Preview</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Customer app/web preview will be available later.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

      </Stack>
    </Container>
  )
}

export default ShopLinkPage
