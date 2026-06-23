import { FairPayClient, PreviewRequest, SplitItem } from '../shared/client';
import { randomUUID } from 'crypto';

/**
 * Receipt Logger Agent
 *
 * Logs a receipt with exact, itemized split amounts.
 * Parses structured input like:
 * {
 *   "group_name": "Weekend Squad",
 *   "description": "Dinner at Quán Ơi (Tiramisu)",
 *   "splits": [
 *     { "member_name": "Thành Long", "amount_vnd": 250000 },
 *     { "member_name": "Hoa Nguyễn", "amount_vnd": 280000 },
 *     { "member_name": "Minh Trần", "amount_vnd": 220000 }
 *   ]
 * }
 */

interface ReceiptSplit {
  member_name: string;
  amount_vnd: number;
}

interface ReceiptInput {
  group_name: string;
  description: string;
  splits: ReceiptSplit[];
}

async function main() {
  const baseUrl = process.env.FAIRPAY_BASE_URL;
  const token = process.env.FAIRPAY_TOKEN;

  if (!baseUrl || !token) {
    console.error('Missing FAIRPAY_BASE_URL or FAIRPAY_TOKEN env vars');
    process.exit(1);
  }

  const client = new FairPayClient(baseUrl, token);

  // Parse input (in a real agent, this would come from the model)
  const input: ReceiptInput = {
    group_name: 'Weekend Squad',
    description: 'Dinner at Quán Ơi (Tiramisu)',
    splits: [
      { member_name: 'Thành Long', amount_vnd: 250000 },
      { member_name: 'Hoa Nguyễn', amount_vnd: 280000 },
      { member_name: 'Minh Trần', amount_vnd: 220000 },
    ],
  };

  console.log(`📄 Receipt: ${input.description}\n`);

  // Step 1: Get authenticated user
  console.log('🔐 Authenticating...');
  const me = await client.me();
  console.log(`✓ User: ${me.email}\n`);

  // Step 2: Find group by name
  console.log('🔍 Finding group...');
  const groupsResp = await client.groups();
  const group = groupsResp.groups.find((g) =>
    g.name.toLowerCase().includes(input.group_name.toLowerCase())
  );

  if (!group) {
    console.error(
      `✗ Group "${input.group_name}" not found. Available groups: ${groupsResp.groups.map((g) => g.name).join(', ')}`
    );
    process.exit(1);
  }

  console.log(`✓ Group: ${group.name} (id: ${group.id})\n`);

  // Step 3: Get group members and resolve names
  console.log('👥 Resolving member names...');
  const membersResp = await client.members(group.id);
  const members = membersResp.members;

  const splits: SplitItem[] = [];
  let totalAmount = 0;

  for (const split of input.splits) {
    // Find member by name (case-insensitive, substring match)
    const member = members.find((m) =>
      m.display_name.toLowerCase().includes(split.member_name.toLowerCase())
    );

    if (!member) {
      console.error(
        `✗ Member "${split.member_name}" not found. Available: ${members.map((m) => m.display_name).join(', ')}`
      );
      process.exit(1);
    }

    splits.push({
      member_id: member.id,
      amount_vnd: split.amount_vnd,
    });

    console.log(`  - ${split.member_name} → ${member.id}`);
    totalAmount += split.amount_vnd;
  }

  console.log();

  // Step 4: Check for duplicates
  console.log('🔎 Checking for duplicates...');
  const dupCheck = await client.checkDuplicates({
    group_id: group.id,
    amount_vnd: totalAmount,
    description: input.description,
  });

  if (dupCheck.matches.length > 0) {
    console.log(`⚠ Found ${dupCheck.matches.length} potential duplicates:`);
    dupCheck.matches.forEach((m) => {
      console.log(
        `  - "${m.description}" (${m.amount_vnd} VND, similarity: ${(m.similarity_score * 100).toFixed(0)}%)`
      );
    });
    console.log(
      'Proceeding anyway (duplicate check is advisory, not blocking).\n'
    );
  } else {
    console.log(`✓ No duplicates found\n`);
  }

  // Step 5: Create preview with exact splits
  console.log('📋 Creating preview...');

  const previewReq: PreviewRequest = {
    group_id: group.id,
    amount_vnd: totalAmount,
    description: input.description,
    split_method: 'exact',
    split_items: splits,
    payment_method: 'direct',
  };

  const preview = await client.preview(previewReq);
  console.log(`✓ Preview created: id=${preview.preview_id}`);
  console.log(`  Description: ${preview.rendered.description}`);
  console.log(`  Splits:`);
  preview.rendered.splits.forEach((s) => {
    console.log(`    - ${s.display_name}: ${s.amount_vnd} VND`);
  });
  console.log(`  Total: ${preview.rendered.amount_vnd} VND\n`);

  // Step 6: Poll for user confirmation in FairPay app
  console.log('⏳ Waiting for user to confirm in FairPay app...');
  console.log(
    '   (Navigate to Expenses tab, click "Confirm" on the preview)\n'
  );

  const maxPollTime = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 2000; // 2 seconds
  const startTime = Date.now();
  let confirmed = false;

  while (Date.now() - startTime < maxPollTime) {
    const status = await client.pollStatus(preview.preview_id);

    if (status.status === 'confirmed') {
      console.log('✓ Preview confirmed by user\n');
      confirmed = true;
      break;
    } else if (status.status === 'expired') {
      console.error('✗ Preview expired. User did not confirm in time.');
      process.exit(1);
    } else if (status.status === 'failed') {
      console.error(
        `✗ Operation failed: ${status.error_code} - ${status.error_message}`
      );
      process.exit(1);
    }

    // Still waiting
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(
      `\r   [${elapsed}s] Status: ${status.status}${' '.repeat(20)}`
    );
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  if (!confirmed) {
    console.error(
      '\n✗ Timeout: User did not confirm within 5 minutes. Preview expired.'
    );
    process.exit(1);
  }

  // Step 7: Commit the expense
  console.log('💾 Committing expense...');
  const idempotencyKey = randomUUID();
  const commit = await client.commit({
    preview_id: preview.preview_id,
    preview_hash: preview.preview_hash,
    confirmation_id: '', // In real scenario, get from confirm response
    idempotency_key: idempotencyKey,
  });

  console.log(`✓ Expense committed: id=${commit.expense_id}`);
  console.log('  Splits recorded:');
  commit.splits.forEach((s) => {
    const member = members.find((m) => m.id === s.member_id);
    console.log(`    - ${member?.display_name}: ${s.amount_vnd} VND`);
  });
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
