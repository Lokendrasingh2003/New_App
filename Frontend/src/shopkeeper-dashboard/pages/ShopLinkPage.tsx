import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { getPublicLink, updateSlug } from '../services/shopService'

const slugRegex = /^[a-z0-9-]{3,50}$/

const ShopLinkPage = () => {
  const shopId = getShopkeeperShopId()
  const { showMessage, showSuccess, showError } = useAppFeedback()
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [savedSlug, setSavedSlug] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [isUpdatingSlug, setIsUpdatingSlug] = useState(false)
  const [availabilityState, setAvailabilityState] = useState<'idle' | 'available' | 'taken'>('idle')
  const [availabilityMessage, setAvailabilityMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!shopId) {
      setPageError('Shop not found for current session.')
      setIsLoading(false)
      return
    }

    const loadPublicLink = async () => {
      try {
        setPageError('')
        setIsLoading(true)
        const data = await getPublicLink(shopId)
        setPublicUrl(data.publicUrl)
        setSavedSlug(data.slug)
        setSlugInput(data.slug)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to load shop link.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPublicLink()
  }, [shopId])

  const slugError = useMemo(() => {
    const normalized = slugInput.trim().toLowerCase()
    if (!normalized) {
      return 'Slug is required'
    }

    if (!slugRegex.test(normalized)) {
      return 'Slug must be 3-50 chars using lowercase letters, numbers, or hyphens'
    }

    return ''
  }, [slugInput])

  const shopLink = publicUrl

  const handleCopy = async () => {
    if (!shopLink) {
      showMessage('Shop link not ready yet')
      return
    }

    try {
      await navigator.clipboard.writeText(shopLink)
      showSuccess('Copied')
    } catch {
      showError('Unable to copy. Please copy manually.')
    }
  }

  const handleUpdateSlug = async () => {
    if (!shopId) {
      showError('Shop not found for current session.')
      return
    }

    const nextSlug = slugInput.trim().toLowerCase()
    if (slugError) {
      setAvailabilityState('taken')
      setAvailabilityMessage(slugError)
      return
    }

    try {
      setIsUpdatingSlug(true)
      const updated = await updateSlug(shopId, nextSlug)
      setSavedSlug(updated.slug)
      setSlugInput(updated.slug)
      setPublicUrl(updated.publicUrl)
      setAvailabilityState('available')
      setAvailabilityMessage('Slug available and updated successfully')
      showSuccess('Slug updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Slug is not available.'
      setAvailabilityState('taken')
      setAvailabilityMessage(message)
      showError(message)
    } finally {
      setIsUpdatingSlug(false)
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

        {pageError ? <Alert severity="error">{pageError}</Alert> : null}

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Stack spacing={2.2}>
              {isLoading ? (
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading shop link...
                  </Typography>
                </Stack>
              ) : null}

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
                <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Custom Slug</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'flex-start' }}>
                  <TextField
                    fullWidth
                    value={slugInput}
                    onChange={(event) => {
                      setSlugInput(event.target.value)
                      setAvailabilityState('idle')
                      setAvailabilityMessage('')
                    }}
                    error={Boolean(slugError) || availabilityState === 'taken'}
                    helperText={slugError || availabilityMessage || '3-50 chars: lowercase letters, numbers, hyphens'}
                    disabled={isLoading || isUpdatingSlug}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      void handleUpdateSlug()
                    }}
                    disabled={isLoading || isUpdatingSlug || !slugInput.trim() || slugInput.trim().toLowerCase() === savedSlug}
                  >
                    {isUpdatingSlug ? 'Checking...' : 'Check & Update'}
                  </Button>
                </Stack>
                {availabilityState === 'available' ? (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    {availabilityMessage}
                  </Alert>
                ) : null}
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
