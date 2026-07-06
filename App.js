(function() {
        // ---------- state ----------
        let expenses = [];
        let nextId = 1;
        let editTargetId = null;
        let monthlyBudget = 0;

        // DOM refs
        const form = document.getElementById('expenseForm');
        const nameInput = document.getElementById('expenseName');
        const amountInput = document.getElementById('expenseAmount');
        const categorySelect = document.getElementById('expenseCategory');
        const editIdInput = document.getElementById('editId');
        const submitBtn = document.getElementById('formSubmitBtn');
        const expenseListEl = document.getElementById('expenseList');
        const categoryFilter = document.getElementById('categoryFilter');

        // summary
        const totalAmountEl = document.getElementById('totalAmount');
        const categoryCountEl = document.getElementById('categoryCount');
        const avgAmountEl = document.getElementById('avgAmount');
        const barChartEl = document.getElementById('barChart');
        const chartLegend = document.getElementById('chartLegend');

        // budget
        const budgetInput = document.getElementById('budgetInput');
        const setBudgetBtn = document.getElementById('setBudgetBtn');
        const budgetDisplay = document.getElementById('budgetDisplay');
        const budgetSpent = document.getElementById('budgetSpent');
        const budgetRemain = document.getElementById('budgetRemain');
        const clearAllBtn = document.getElementById('clearAllBtn');

        // ---------- helpers ----------
        function formatCurrency(val) {
            return '$' + Number(val).toFixed(2);
        }

        // ---------- render ----------
        function render() {
            const filter = categoryFilter.value;
            let filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter);

            // list
            if (filtered.length === 0) {
                expenseListEl.innerHTML = `<div class="empty-state"><i class="fas fa-inbox" style="margin-right:0.4rem;"></i>No expenses</div>`;
            } else {
                expenseListEl.innerHTML = filtered.map(exp => {
                    const isEditing = (editTargetId === exp.id);
                    return `<div class="expense-item ${isEditing ? 'edit-mode' : ''}">
                        <div class="expense-info">
                            <span class="expense-name">${escapeHtml(exp.name)}</span>
                            <span class="expense-amount">${formatCurrency(exp.amount)}</span>
                            <span class="expense-cat">${escapeHtml(exp.category)}</span>
                        </div>
                        <div class="expense-actions">
                            <button onclick="editExpense(${exp.id})" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteExpense(${exp.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>`;
                }).join('');
            }

            // summary stats
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            const uniqueCats = new Set(expenses.map(e => e.category));
            const avg = expenses.length ? total / expenses.length : 0;
            totalAmountEl.textContent = formatCurrency(total);
            categoryCountEl.textContent = uniqueCats.size;
            avgAmountEl.textContent = formatCurrency(avg);

            // chart
            renderChart();

            // budget
            updateBudgetUI(total);

            // update legend
            const catCount = uniqueCats.size;
            chartLegend.textContent = catCount ? `${catCount} categories` : '—';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // chart
        function renderChart() {
            const catMap = {};
            expenses.forEach(e => {
                catMap[e.category] = (catMap[e.category] || 0) + e.amount;
            });
            const entries = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
            const max = entries.length ? Math.max(...entries.map(([,v]) => v)) : 1;

            let html = '';
            if (entries.length === 0) {
                html = '<div style="width:100%; text-align:center; color:#9aafc7; font-size:0.8rem; padding:1.2rem 0;">No data</div>';
            } else {
                entries.forEach(([cat, val]) => {
                    const pct = max > 0 ? (val / max) * 100 : 0;
                    const height = Math.max(6, pct * 0.9);
                    html += `<div class="bar-item">
                        <div class="bar" style="height:${height}px; background:${getColor(cat)};"></div>
                        <span class="bar-label">${cat.slice(0,4)}</span>
                    </div>`;
                });
            }
            barChartEl.innerHTML = html;
        }

        function getColor(cat) {
            const colors = {
                'Food':'#2a7de1','Transport':'#f09b43','Shopping':'#9b59b6',
                'Bills':'#e67e22','Entertainment':'#1abc9c','Health':'#e74c3c','Other':'#95a5a6'
            };
            return colors[cat] || '#6c8ab0';
        }

        // budget UI
        function updateBudgetUI(total) {
            budgetDisplay.textContent = formatCurrency(monthlyBudget);
            budgetSpent.textContent = formatCurrency(total);
            if (monthlyBudget > 0) {
                const remain = monthlyBudget - total;
                const remainText = remain >= 0 ? formatCurrency(remain) : formatCurrency(Math.abs(remain)) + ' over';
                const cls = remain >= 0 ? '' : 'over';
                budgetRemain.innerHTML = `<span class="${cls}" style="font-weight:500;">${remain >= 0 ? 'Remaining' : 'Overspent'}: ${remainText}</span>`;
            } else {
                budgetRemain.innerHTML = `<span class="text-muted">No budget set</span>`;
            }
        }

        // ---------- CRUD ----------
        function addExpense(name, amount, category) {
            const newExp = { id: nextId++, name, amount, category };
            expenses.push(newExp);
            render();
        }

        function updateExpense(id, name, amount, category) {
            const idx = expenses.findIndex(e => e.id === id);
            if (idx !== -1) {
                expenses[idx] = { ...expenses[idx], name, amount, category };
                render();
            }
        }

        window.deleteExpense = function(id) {
            if (confirm('Delete this expense?')) {
                expenses = expenses.filter(e => e.id !== id);
                if (editTargetId === id) cancelEdit();
                render();
            }
        };

        window.editExpense = function(id) {
            const exp = expenses.find(e => e.id === id);
            if (!exp) return;
            editTargetId = id;
            nameInput.value = exp.name;
            amountInput.value = exp.amount;
            categorySelect.value = exp.category;
            editIdInput.value = id;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update';
            submitBtn.style.background = '#1f8b4c';
            render(); // highlight
        };

        function cancelEdit() {
            editTargetId = null;
            editIdInput.value = '';
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
            submitBtn.style.background = '';
            nameInput.value = '';
            amountInput.value = '';
            categorySelect.value = 'Food';
            render();
        }

        // clear all
        clearAllBtn.addEventListener('click', function() {
            if (expenses.length && confirm('Delete all expenses?')) {
                expenses = [];
                cancelEdit();
                render();
            }
        });

        // form submit
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = nameInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const category = categorySelect.value;

            if (!name || isNaN(amount) || amount <= 0) {
                alert('Please enter a valid description and amount.');
                return;
            }

            const editId = editIdInput.value;
            if (editId) {
                updateExpense(Number(editId), name, amount, category);
                cancelEdit();
            } else {
                addExpense(name, amount, category);
                nameInput.value = '';
                amountInput.value = '';
                categorySelect.value = 'Food';
            }
            render();
        });

        // filter
        categoryFilter.addEventListener('change', render);

        // budget
        setBudgetBtn.addEventListener('click', function() {
            const val = parseFloat(budgetInput.value);
            if (isNaN(val) || val < 0) {
                alert('Enter a valid budget amount.');
                return;
            }
            monthlyBudget = val;
            budgetInput.value = '';
            updateBudgetUI(expenses.reduce((s,e) => s + e.amount, 0));
            render(); // update display
        });

        // init with sample data
        function initSample() {
            const sample = [
                { id: nextId++, name: 'Grocery', amount: 120.50, category: 'Food' },
                { id: nextId++, name: 'Uber ride', amount: 24.75, category: 'Transport' },
                { id: nextId++, name: 'Netflix', amount: 15.99, category: 'Entertainment' },
                { id: nextId++, name: 'Phone bill', amount: 48.00, category: 'Bills' },
                { id: nextId++, name: 'New shoes', amount: 85.00, category: 'Shopping' },
            ];
            expenses = sample;
            monthlyBudget = 350;
            budgetInput.value = '';
            render();
            // set budget display
            document.getElementById('budgetDisplay').textContent = formatCurrency(monthlyBudget);
            updateBudgetUI(expenses.reduce((s,e) => s + e.amount, 0));
        }
        initSample();

        // expose for inline onclick
        window.deleteExpense = deleteExpense;
        window.editExpense = editExpense;

        // extra: cancel edit on Esc? (optional)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editTargetId) {
                cancelEdit();
                render();
            }
        });
    })();