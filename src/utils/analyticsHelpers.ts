import { CategoryType, Expense, BudgetStats, MoneyMoodInfo, StreakStats, MoneyReplayData } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from './formatters';

/**
 * Format a Date to local YYYY-MM-DD string
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Month name from index (0-11)
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex] || '';
}

/**
 * Calculate Monthly Budget Statistics for a given month
 */
export function getMonthlyBudgetStats(
  expenses: Expense[],
  monthlyBudget: number = 0,
  targetDate: Date = new Date()
): BudgetStats {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  let spent = 0;
  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
      spent += Number(exp.amount) || 0;
    }
  }

  const hasBudget = Boolean(monthlyBudget && monthlyBudget > 0);

  if (!hasBudget) {
    return {
      monthlyBudget: 0,
      spent,
      remaining: 0,
      overAmount: 0,
      percentageUsed: 0,
      status: 'no_budget',
      hasBudget: false,
    };
  }

  const percentageUsed = Math.round((spent / monthlyBudget) * 100);
  const remaining = Math.max(monthlyBudget - spent, 0);
  const overAmount = Math.max(spent - monthlyBudget, 0);

  let status: BudgetStats['status'] = 'healthy';
  if (spent > monthlyBudget) {
    status = 'over_budget';
  } else if (percentageUsed >= 80) {
    status = 'near_limit';
  }

  return {
    monthlyBudget,
    spent,
    remaining,
    overAmount,
    percentageUsed,
    status,
    hasBudget: true,
  };
}

/**
 * Calculate Streaks (Tracking, No-Spend, Under-Budget) based strictly on local expenses
 */
export function calculateStreaks(
  expenses: Expense[],
  monthlyBudget: number = 0
): StreakStats {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDayOfMonth = today.getDate();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Map each local date string YYYY-MM-DD to total spending
  const dailySpendMap: Record<string, number> = {};
  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    const dateStr = toLocalDateString(d);
    dailySpendMap[dateStr] = (dailySpendMap[dateStr] || 0) + (Number(exp.amount) || 0);
  }

  // 1. Calculate this month's spending days vs no-spend days up to current day
  let totalSpendingDaysThisMonth = 0;
  let totalNoSpendDaysThisMonth = 0;

  for (let day = 1; day <= currentDayOfMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    const dateStr = toLocalDateString(d);
    const daySpend = dailySpendMap[dateStr] || 0;
    if (daySpend > 0) {
      totalSpendingDaysThisMonth++;
    } else {
      totalNoSpendDaysThisMonth++;
    }
  }

  // If no expenses at all in history
  if (expenses.length === 0) {
    return {
      trackingStreak: 0,
      noSpendStreak: 0,
      underBudgetStreak: 0,
      totalSpendingDaysThisMonth: 0,
      totalNoSpendDaysThisMonth: currentDayOfMonth,
    };
  }

  // 2. Calculate Tracking Streak (Consecutive days with at least 1 expense)
  let trackingStreak = 0;
  const todayStr = toLocalDateString(today);
  const hasExpenseToday = (dailySpendMap[todayStr] || 0) > 0;

  // Start from today if logged today, else start from yesterday
  let checkDate = new Date(today);
  if (!hasExpenseToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = toLocalDateString(checkDate);
    if ((dailySpendMap[dateStr] || 0) > 0) {
      trackingStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    // Safety guard
    if (trackingStreak > 3650) break;
  }

  // 3. Calculate No-Spend Streak (Consecutive days with 0 expenses)
  let noSpendStreak = 0;
  let checkNoSpendDate = new Date(today);
  if (hasExpenseToday) {
    // If spent today, no-spend streak is 0
    noSpendStreak = 0;
  } else {
    while (true) {
      const dateStr = toLocalDateString(checkNoSpendDate);
      if ((dailySpendMap[dateStr] || 0) === 0) {
        noSpendStreak++;
        checkNoSpendDate.setDate(checkNoSpendDate.getDate() - 1);
      } else {
        break;
      }
      if (noSpendStreak > 365) break;
    }
  }

  // 4. Calculate Under-Budget Streak
  let underBudgetStreak = 0;
  if (monthlyBudget > 0) {
    const dailyLimit = monthlyBudget / daysInCurrentMonth;
    let checkBudgetDate = new Date(today);

    while (true) {
      const dateStr = toLocalDateString(checkBudgetDate);
      const daySpend = dailySpendMap[dateStr] || 0;
      if (daySpend <= dailyLimit) {
        underBudgetStreak++;
        checkBudgetDate.setDate(checkBudgetDate.getDate() - 1);
      } else {
        break;
      }
      if (underBudgetStreak > 365) break;
    }
  }

  return {
    trackingStreak,
    noSpendStreak,
    underBudgetStreak,
    totalSpendingDaysThisMonth,
    totalNoSpendDaysThisMonth,
  };
}

/**
 * Calculate Money Mood deterministically from actual spending behavior
 */
export function calculateMoneyMood(
  expenses: Expense[],
  monthlyBudget: number = 0,
  targetDate: Date = new Date()
): MoneyMoodInfo {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();
  const currentDay = targetDate.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let spentThisMonth = 0;
  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      spentThisMonth += Number(exp.amount) || 0;
    }
  }

  // If no budget set
  if (!monthlyBudget || monthlyBudget <= 0) {
    if (spentThisMonth === 0) {
      return {
        mood: 'Comfortable',
        title: 'Comfortable',
        description: 'No expenses recorded yet this month.',
        badgeColor: '#10B981',
        textColor: '#047857',
        bgColor: '#ECFDF5',
      };
    }
    return {
      mood: 'Comfortable',
      title: 'Comfortable',
      description: "You're spending at a steady pace.",
      badgeColor: '#10B981',
      textColor: '#047857',
      bgColor: '#ECFDF5',
    };
  }

  // Budget is configured: compare progress
  const portionOfMonthElapsed = currentDay / daysInMonth;
  const portionOfBudgetUsed = spentThisMonth / monthlyBudget;

  if (spentThisMonth > monthlyBudget || portionOfBudgetUsed > portionOfMonthElapsed * 1.25) {
    return {
      mood: 'Tight',
      title: 'Tight',
      description: 'You are approaching or exceeding your monthly budget.',
      badgeColor: '#EF4444',
      textColor: '#B91C1C',
      bgColor: '#FEF2F2',
    };
  }

  if (portionOfBudgetUsed > portionOfMonthElapsed * 0.9) {
    return {
      mood: 'Moderate',
      title: 'Moderate',
      description: "You're spending at a steady pace. Keep an eye on your remaining budget.",
      badgeColor: '#F59E0B',
      textColor: '#B45309',
      bgColor: '#FFFBEB',
    };
  }

  return {
    mood: 'Comfortable',
    title: 'Comfortable',
    description: "You're spending at a healthy pace.",
    badgeColor: '#10B981',
    textColor: '#047857',
    bgColor: '#ECFDF5',
  };
}

/**
 * Generate Natural Language "Explain My Month" summary
 */
export function generateExplainMyMonth(
  expenses: Expense[],
  monthlyBudget: number = 0,
  targetDate: Date = new Date(),
  currency: string = '₹'
): { text: string; hasData: boolean; title: string } {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const monthName = getMonthName(targetMonth);

  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  if (monthExpenses.length === 0) {
    return {
      title: `Your ${monthName} spending`,
      text: 'Add a few expenses and Expenza will explain your spending here.',
      hasData: false,
    };
  }

  let totalSpent = 0;
  const catMap: Record<CategoryType, number> = {
    Food: 0,
    Transport: 0,
    Shopping: 0,
    Bills: 0,
    Entertainment: 0,
    Health: 0,
    Travel: 0,
    Education: 0,
    Other: 0,
  };
  const daysSet = new Set<string>();

  for (const exp of monthExpenses) {
    const amount = Number(exp.amount) || 0;
    totalSpent += amount;
    catMap[exp.category] = (catMap[exp.category] || 0) + amount;
    const d = new Date(exp.createdAt);
    daysSet.add(toLocalDateString(d));
  }

  const spendingDays = daysSet.size;
  const currentDay = targetDate.getDate();
  const noSpendDays = Math.max(currentDay - spendingDays, 0);

  // Top category
  let topCategory: { category: CategoryType; amount: number } | null = null;
  for (const [cat, amt] of Object.entries(catMap)) {
    if (amt > 0 && (!topCategory || amt > topCategory.amount)) {
      topCategory = { category: cat as CategoryType, amount: amt };
    }
  }

  const formattedTotal = formatCurrency(totalSpent, currency);
  const sentences: string[] = [];

  sentences.push(
    `You spent ${formattedTotal} this month across ${spendingDays} ${spendingDays === 1 ? 'spending day' : 'spending days'}.`
  );

  if (topCategory) {
    const formattedCatAmount = formatCurrency(topCategory.amount, currency);
    sentences.push(
      `${topCategory.category} was your biggest category at ${formattedCatAmount}.`
    );
  }

  if (noSpendDays > 0) {
    if (monthlyBudget > 0) {
      const budgetPct = Math.round((totalSpent / monthlyBudget) * 100);
      sentences.push(
        `You had ${noSpendDays} ${noSpendDays === 1 ? 'no-spend day' : 'no-spend days'} and used ${budgetPct}% of your monthly budget.`
      );
    } else {
      sentences.push(
        `You kept your wallet untouched for ${noSpendDays} ${noSpendDays === 1 ? 'day' : 'days'}.`
      );
    }
  } else if (monthlyBudget > 0) {
    const budgetPct = Math.round((totalSpent / monthlyBudget) * 100);
    sentences.push(`You have used ${budgetPct}% of your monthly budget.`);
  }

  return {
    title: `Your ${monthName} spending`,
    text: sentences.join(' '),
    hasData: true,
  };
}

/**
 * Generate Money Replay (Monthly Recap) data
 */
export function generateMoneyReplayData(
  expenses: Expense[],
  monthlyBudget: number = 0,
  targetDate: Date = new Date()
): MoneyReplayData {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const monthName = getMonthName(targetMonth);

  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  if (monthExpenses.length === 0) {
    return {
      monthName,
      year: targetYear,
      totalSpent: 0,
      topCategory: null,
      spendingDaysCount: 0,
      noSpendDaysCount: targetDate.getDate(),
      biggestExpense: null,
      budgetPercentage: null,
      hasBudget: Boolean(monthlyBudget && monthlyBudget > 0),
      hasExpenses: false,
    };
  }

  let totalSpent = 0;
  let biggestExpense: Expense | null = null;
  const catTotals: Record<CategoryType, number> = {
    Food: 0,
    Transport: 0,
    Shopping: 0,
    Bills: 0,
    Entertainment: 0,
    Health: 0,
    Travel: 0,
    Education: 0,
    Other: 0,
  };
  const uniqueDays = new Set<string>();

  for (const exp of monthExpenses) {
    const amount = Number(exp.amount) || 0;
    totalSpent += amount;
    catTotals[exp.category] = (catTotals[exp.category] || 0) + amount;
    uniqueDays.add(toLocalDateString(new Date(exp.createdAt)));

    if (!biggestExpense || amount > biggestExpense.amount) {
      biggestExpense = exp;
    }
  }

  let topCategory: { category: CategoryType; amount: number; percentage: number } | null = null;
  for (const [cat, amt] of Object.entries(catTotals)) {
    if (amt > 0 && (!topCategory || amt > topCategory.amount)) {
      const percentage = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
      topCategory = { category: cat as CategoryType, amount: amt, percentage };
    }
  }

  const spendingDaysCount = uniqueDays.size;
  const noSpendDaysCount = Math.max(targetDate.getDate() - spendingDaysCount, 0);
  const budgetPercentage =
    monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : null;

  return {
    monthName,
    year: targetYear,
    totalSpent,
    topCategory,
    spendingDaysCount,
    noSpendDaysCount,
    biggestExpense,
    budgetPercentage,
    hasBudget: Boolean(monthlyBudget && monthlyBudget > 0),
    hasExpenses: true,
  };
}

/**
 * Get daily spending breakdown map for a given month and year
 */
export function getDailySpendingMap(
  expenses: Expense[],
  year: number,
  month: number // 0-indexed
): Record<number, { total: number; count: number; expenses: Expense[] }> {
  const result: Record<number, { total: number; count: number; expenses: Expense[] }> = {};

  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!result[day]) {
        result[day] = { total: 0, count: 0, expenses: [] };
      }
      result[day].total += Number(exp.amount) || 0;
      result[day].count += 1;
      result[day].expenses.push(exp);
    }
  }

  // Sort expenses in each day descending by date
  for (const day in result) {
    result[day].expenses.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return result;
}
