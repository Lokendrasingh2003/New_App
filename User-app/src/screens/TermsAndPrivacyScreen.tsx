import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';

export function TermsAndPrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <AppHeader title="Terms & Privacy" />
      <View style={styles.content}>
        <AppText style={styles.heading}>Terms of Service</AppText>
        <AppText style={styles.paragraph}>
          Welcome to our app! By using our services, you agree to the following terms:
        </AppText>
        <AppText style={styles.bullet}>• You must use the app in compliance with all applicable laws.</AppText>
        <AppText style={styles.bullet}>• Do not misuse, hack, or disrupt our services.</AppText>
        <AppText style={styles.bullet}>• We may update these terms at any time. Continued use means you accept the changes.</AppText>
        <AppText style={styles.bullet}>• All content and features are provided "as is" without warranty.</AppText>
        <AppText style={styles.bullet}>• We reserve the right to suspend or terminate accounts for violations.</AppText>

        <AppText style={styles.heading}>Privacy Policy</AppText>
        <AppText style={styles.paragraph}>
          Your privacy is important to us. This policy explains how we handle your data:
        </AppText>
        <AppText style={styles.bullet}>• We collect only necessary information to provide our services.</AppText>
        <AppText style={styles.bullet}>• Your data is never sold to third parties.</AppText>
        <AppText style={styles.bullet}>• We use industry-standard security to protect your information.</AppText>
        <AppText style={styles.bullet}>• You can request deletion of your account and data at any time.</AppText>
        <AppText style={styles.bullet}>• We may update this policy; please review it periodically.</AppText>

        <AppText style={styles.heading}>Contact Us</AppText>
        <AppText style={styles.paragraph}>
          If you have questions about our terms or privacy policy, contact us at support@example.com.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    color: '#222',
  },
  paragraph: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#444',
    marginLeft: 12,
    marginBottom: 4,
  },
});
