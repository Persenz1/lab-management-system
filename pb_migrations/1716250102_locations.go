package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		collection := core.NewBaseCollection("locations")

		collection.Fields.Add(
			&core.SelectField{
				Name:     "code",
				Required: true,
				Values:   []string{"A", "B", "C", "D", "E", "F", "UNCATEGORIZED", "OTHER"},
			},
			&core.TextField{Name: "display_name", Required: true},
			&core.TextField{Name: "description", Required: false},
			&core.NumberField{Name: "sort_order", Required: false},
			&core.BoolField{Name: "is_active", Required: true},
		)

		collection.ListRule = types.Pointer("is_active = true")
		collection.ViewRule = types.Pointer("is_active = true")
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		if err := app.Save(collection); err != nil {
			return err
		}

		initData := []struct {
			code        string
			displayName string
			description string
			sortOrder   float64
		}{
			{"A", "A区", "待盘库后填写", 1},
			{"B", "B区", "待盘库后填写", 2},
			{"C", "C区", "待盘库后填写", 3},
			{"D", "D区", "待盘库后填写", 4},
			{"E", "E区", "待盘库后填写", 5},
			{"F", "F区", "待盘库后填写", 6},
			{"UNCATEGORIZED", "未分类", "暂未确定位置", 7},
			{"OTHER", "其他", "其他位置", 8},
		}

		for _, d := range initData {
			record := core.NewRecord(collection)
			record.Set("code", d.code)
			record.Set("display_name", d.displayName)
			record.Set("description", d.description)
			record.Set("sort_order", d.sortOrder)
			record.Set("is_active", true)
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("locations")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
