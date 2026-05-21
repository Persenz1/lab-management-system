package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		equipmentCollection, err := app.FindCollectionByNameOrId("equipment")
		if err != nil {
			return err
		}
		itemsCollection, err := app.FindCollectionByNameOrId("items")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("equipment_usage")

		collection.Fields.Add(
			&core.RelationField{
				Name:         "equipment",
				Required:     true,
				CollectionId: equipmentCollection.Id,
				MaxSelect:    types.Pointer(1),
			},
			&core.TextField{Name: "user_name", Required: true},
			&core.TextField{Name: "start_time", Required: true},
			&core.TextField{Name: "end_time", Required: false},
			&core.NumberField{Name: "estimated_duration", Required: false},
			&core.RelationField{
				Name:         "materials",
				Required:     false,
				CollectionId: itemsCollection.Id,
				MaxSelect:    types.Pointer(999),
			},
			&core.SelectField{
				Name:     "status",
				Required: true,
				Values:   []string{"active", "closed"},
			},
			&core.SelectField{
				Name:     "end_reason",
				Required: false,
				Values:   []string{"overridden_by_new_usage", "admin_closed", "manual_end", "system_timeout_marked"},
			},
			&core.TextField{Name: "note", Required: false},
		)

		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("equipment_usage")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
