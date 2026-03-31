import { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';

type Faq = {
  id: string;
  question: string;
  answer: string;
};

const SUPPORT_PHONE = '+919999999999';
const SUPPORT_EMAIL = 'support@yourapp.com';

const FAQS: Faq[] = [
  {
    id: 'otp',
    question: 'OTP not received',
    answer:
      'Please wait for 30 seconds and try resend OTP. Ensure your network is stable and DND is disabled for transactional messages.',
  },
  {
    id: 'coupon',
    question: 'How to apply coupon',
    answer:
      'Go to Cart or Checkout, enter a valid coupon code, and tap Apply. You can also browse available coupons from Coupons & Offers.',
  },
  {
    id: 'refund',
    question: 'Refund timeline',
    answer:
      'Refunds are usually initiated instantly after cancellation and may take 3-7 working days to reflect based on your payment method.',
  },
  {
    id: 'cancel-order',
    question: 'Cancel order',
    answer:
      'Open Order Details and use Cancel Order while the order is in confirmed/accepted/preparing state. Delivered orders cannot be cancelled.',
  },
  {
    id: 'delivery',
    question: 'Delivery charges',
    answer:
      'Delivery charge depends on cart value and coupons. Free-delivery coupons can reduce the delivery charge to ₹0 when eligible.',
  },
  {
    id: 'address',
    question: 'Change address',
    answer:
      'You can manage addresses in Profile > Saved Addresses and set a default address for checkout.',
  },
  {
    id: 'contact-shop',
    question: 'How to contact shop',
    answer:
      'Direct shop calling feature will be available soon. Meanwhile please contact support and share your order details.',
  },
  {
    id: 'delete-account',
    question: 'How to delete account (future)',
    answer:
      'Account deletion self-service will be added in a future update. For now, please raise a support request from this screen.',
  },
];

const ISSUE_CATEGORIES = ['Payment', 'Delivery', 'App Bug', 'Other'] as const;

type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export function HelpCenterScreen() {
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [issueCategory, setIssueCategory] = useState<IssueCategory | null>(null);
  const [issueMessage, setIssueMessage] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const canSubmitIssue = useMemo(
    () => Boolean(issueCategory && issueMessage.trim().length > 0),
    [issueCategory, issueMessage],
  );

  const openLinkSafely = async (url: string, fallbackTitle: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(fallbackTitle, 'This action is not supported on your device.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(fallbackTitle, 'Unable to open right now. Please try again.');
    }
  };

  const handleCallSupport = () => {
    openLinkSafely(`tel:${SUPPORT_PHONE}`, 'Call Support');
  };

  const handleWhatsAppSupport = () => {
    const digits = SUPPORT_PHONE.replace(/[^\d]/g, '');
    openLinkSafely(`https://wa.me/${digits}`, 'WhatsApp');
  };

  const handleEmailSupport = () => {
    openLinkSafely(`mailto:${SUPPORT_EMAIL}`, 'Email Us');
  };

  const handleSubmitIssue = () => {
    if (!canSubmitIssue) {
      return;
    }

    Alert.alert('Thanks, we received your request');
    setIssueCategory(null);
    setIssueMessage('');
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Help Center" />
      <AppText style={styles.subtitle}>How can we help you?</AppText>

      <View style={styles.quickActionsWrap}>
        <Pressable style={styles.quickActionCard} onPress={handleCallSupport}>
          <AppText style={styles.quickActionIcon}>📞</AppText>
          <AppText style={styles.quickActionTitle}>Call Support</AppText>
          <AppText style={styles.quickActionMeta}>+91 99999 99999</AppText>
        </Pressable>

        <Pressable style={styles.quickActionCard} onPress={handleWhatsAppSupport}>
          <AppText style={styles.quickActionIcon}>💬</AppText>
          <AppText style={styles.quickActionTitle}>WhatsApp</AppText>
          <AppText style={styles.quickActionMeta}>Chat with us</AppText>
        </Pressable>

        <Pressable style={styles.quickActionCard} onPress={handleEmailSupport}>
          <AppText style={styles.quickActionIcon}>✉️</AppText>
          <AppText style={styles.quickActionTitle}>Email Us</AppText>
          <AppText style={styles.quickActionMeta}>{SUPPORT_EMAIL}</AppText>
        </Pressable>
      </View>

      <View style={styles.sectionWrap}>
        <AppText style={styles.sectionTitle}>Frequently Asked Questions</AppText>

        <View style={styles.cardWrap}>
          {FAQS.map((faq, index) => {
            const expanded = expandedFaqId === faq.id;

            return (
              <View key={faq.id}>
                <Pressable
                  style={styles.faqRow}
                  onPress={() => setExpandedFaqId((current) => (current === faq.id ? null : faq.id))}
                >
                  <AppText style={styles.faqQuestion}>{faq.question}</AppText>
                  <AppText style={styles.faqChevron}>{expanded ? '−' : '+'}</AppText>
                </Pressable>

                {expanded ? <AppText style={styles.faqAnswer}>{faq.answer}</AppText> : null}

                {index < FAQS.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <AppText style={styles.sectionTitle}>Report an Issue</AppText>

        <View style={styles.cardWrap}>
          <Pressable style={styles.categorySelector} onPress={() => setCategoryModalVisible(true)}>
            <AppText style={styles.categoryLabel}>Category</AppText>
            <AppText style={styles.categoryValue}>{issueCategory ?? 'Select category'}</AppText>
          </Pressable>

          <View style={styles.messageWrap}>
            <AppInput
              label="Message"
              multiline
              numberOfLines={4}
              value={issueMessage}
              onChangeText={setIssueMessage}
              placeholder="Describe your issue"
              style={styles.messageInput}
            />
          </View>

          <AppButton title="Submit" onPress={handleSubmitIssue} disabled={!canSubmitIssue} />
        </View>
      </View>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <AppText style={styles.modalTitle}>Select Category</AppText>

            <ScrollView showsVerticalScrollIndicator={false}>
              {ISSUE_CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setIssueCategory(category);
                    setCategoryModalVisible(false);
                  }}
                >
                  <AppText style={styles.modalOptionText}>{category}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  quickActionsWrap: {
    marginTop: 10,
    gap: 8,
  },
  quickActionCard: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    fontSize: 18,
  },
  quickActionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  quickActionMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  cardWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  faqRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  faqChevron: {
    fontSize: 20,
    color: '#6B7280',
    lineHeight: 20,
  },
  faqAnswer: {
    marginTop: -2,
    marginBottom: 8,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  categorySelector: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryValue: {
    marginTop: 2,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  messageWrap: {
    marginTop: 10,
    marginBottom: 10,
  },
  messageInput: {
    minHeight: 96,
    height: 96,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalOptionRow: {
    minHeight: 46,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
