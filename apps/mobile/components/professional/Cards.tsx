import { Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Screen";

interface ChildSummaryProps {
  age: number;
  categoryLabel: string;
  frameworkLabel: string;
  functioningLabel: string;
  communicationLabel: string;
}

function ChildSummary({
  age,
  categoryLabel,
  frameworkLabel,
  functioningLabel,
  communicationLabel,
}: ChildSummaryProps) {
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {[
        `${age}`,
        categoryLabel,
        frameworkLabel,
        functioningLabel,
        communicationLabel,
      ].map((chip, index) => (
        <View
          key={`${chip}-${index}`}
          className="bg-surface-2 rounded-full px-3 py-1"
        >
          <Text className="text-xs text-ink-2">{chip}</Text>
        </View>
      ))}
    </View>
  );
}

interface IncomingRequestCardProps {
  childName: string;
  age: number;
  categoryLabel: string;
  frameworkLabel: string;
  functioningLabel: string;
  communicationLabel: string;
  statusLabel: string;
  statusColor: string;
  parentMessage?: string | null;
  matchReason?: string | null;
  canRespond: boolean;
  respondLabel: string;
  rejectLabel: string;
  onAccept: () => void;
  onReject: () => void;
  loading?: boolean;
}

export function IncomingRequestCard({
  childName,
  age,
  categoryLabel,
  frameworkLabel,
  functioningLabel,
  communicationLabel,
  statusLabel,
  statusColor,
  parentMessage,
  matchReason,
  canRespond,
  respondLabel,
  rejectLabel,
  onAccept,
  onReject,
  loading = false,
}: IncomingRequestCardProps) {
  return (
    <View className="bg-surface border border-border rounded-card p-5 mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-lg font-bold text-ink font-rubik">{childName}</Text>
        <Text className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</Text>
      </View>

      <ChildSummary
        age={age}
        categoryLabel={categoryLabel}
        frameworkLabel={frameworkLabel}
        functioningLabel={functioningLabel}
        communicationLabel={communicationLabel}
      />

      {parentMessage ? (
        <Text className="text-sm text-ink-2 leading-5 mt-3">{parentMessage}</Text>
      ) : null}

      {matchReason ? (
        <Text className="text-xs text-teal mt-2">{matchReason}</Text>
      ) : null}

      {canRespond ? (
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <PrimaryButton
              label={respondLabel}
              onPress={onAccept}
              variant="teal"
              loading={loading}
            />
          </View>
          <Pressable
            onPress={onReject}
            disabled={loading}
            className="flex-1 rounded-card py-4 px-6 items-center border border-border active:opacity-90"
          >
            <Text className="text-ink-2 text-base font-semibold font-rubik">
              {rejectLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

interface BrowseChildCardProps {
  childName: string;
  age: number;
  categoryLabel: string;
  frameworkLabel: string;
  functioningLabel: string;
  communicationLabel: string;
  interestLabel: string;
  onExpressInterest: () => void;
  loading?: boolean;
}

export function BrowseChildCard({
  childName,
  age,
  categoryLabel,
  frameworkLabel,
  functioningLabel,
  communicationLabel,
  interestLabel,
  onExpressInterest,
  loading = false,
}: BrowseChildCardProps) {
  return (
    <View className="bg-surface border border-border rounded-card p-5 mb-4">
      <Text className="text-lg font-bold text-ink font-rubik">{childName}</Text>
      <ChildSummary
        age={age}
        categoryLabel={categoryLabel}
        frameworkLabel={frameworkLabel}
        functioningLabel={functioningLabel}
        communicationLabel={communicationLabel}
      />
      <View className="mt-4">
        <PrimaryButton
          label={interestLabel}
          onPress={onExpressInterest}
          variant="teal"
          loading={loading}
        />
      </View>
    </View>
  );
}
